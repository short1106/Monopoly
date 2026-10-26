// Dulidanopoly – Online-Verbindung über PeerJS (Host-Gerät hält das Spiel, alle anderen verbinden sich direkt)
(function (root) {
  const PREFIX = 'dulidanopoly-v1-';
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function peerOptions() {
    const q = new URLSearchParams(location.search);
    const opts = { debug: 0 };
    if (q.get('peerhost')) {
      opts.host = q.get('peerhost');
      opts.port = Number(q.get('peerport') || 9000);
      opts.path = q.get('peerpath') || '/';
      opts.secure = q.get('peersecure') === '1';
    }
    return opts;
  }

  function randomCode() {
    let s = '';
    for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  const Net = {
    mode: null, code: null, peer: null, conns: new Map(), conn: null,
    handlers: { message() {}, status() {}, peerLeft() {} },

    // ----- Host -----
    host(code, onReady) {
      this.mode = 'host';
      this.code = code;
      const peer = new Peer(PREFIX + code, peerOptions());
      this.peer = peer;
      let opened = false;
      peer.on('open', () => { opened = true; this.handlers.status('online'); onReady(null, code); });
      peer.on('error', (e) => {
        if (e.type === 'unavailable-id' && !opened) {
          peer.destroy();
          onReady('taken');
          return;
        }
        if (!opened) onReady(e.type || 'error');
        else this.handlers.status('error', e.type);
      });
      peer.on('disconnected', () => {
        this.handlers.status('reconnecting');
        setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 1500);
      });
      peer.on('connection', (conn) => {
        conn.on('data', (msg) => this.handlers.message(msg, conn));
        conn.on('close', () => {
          if (conn.clientId && this.conns.get(conn.clientId) === conn) {
            this.conns.delete(conn.clientId);
            this.handlers.peerLeft(conn.clientId);
          }
        });
        conn.on('error', () => {});
      });
    },

    register(conn, clientId) {
      const old = this.conns.get(clientId);
      if (old && old !== conn) { try { old.close(); } catch (e) { /* schon zu */ } }
      conn.clientId = clientId;
      this.conns.set(clientId, conn);
    },

    broadcast(msg) {
      for (const c of this.conns.values()) if (c.open) c.send(msg);
    },

    // ----- Client -----
    join(code, hello) {
      this.mode = 'client';
      this.code = code;
      const connect = () => {
        if (this.peer && !this.peer.destroyed) this.peer.destroy();
        const peer = new Peer(peerOptions());
        this.peer = peer;
        peer.on('open', () => {
          const conn = peer.connect(PREFIX + code, { reliable: true });
          this.conn = conn;
          conn.on('open', () => { this.handlers.status('online'); conn.send(hello()); });
          conn.on('data', (msg) => this.handlers.message(msg, conn));
          conn.on('close', () => { this.handlers.status('lost'); retry(); });
        });
        peer.on('error', (e) => {
          if (e.type === 'peer-unavailable') this.handlers.status('noroom');
          else this.handlers.status('lost');
          retry();
        });
      };
      let timer = null;
      const retry = () => {
        if (timer) return;
        timer = setTimeout(() => { timer = null; connect(); }, 3000);
      };
      this.reconnect = () => { clearTimeout(timer); timer = null; connect(); };
      connect();
    },

    send(msg) {
      if (this.conn && this.conn.open) { this.conn.send(msg); return true; }
      return false;
    },

    leave() {
      if (this.peer) this.peer.destroy();
      this.peer = null; this.conn = null; this.conns.clear(); this.mode = null;
    },
  };

  root.DULI_NET = Net;
  root.DULI_NET.randomCode = randomCode;
})(window);
