import * as pc from 'playcanvas';

export class MultiplayerService {
  constructor(app) {
    this.app = app;
    this.peer = null;
    this.connections = {};
    this.playerId = null;
    this.isConnected = false;

    // Event callbacks that can be overridden by external code
    this.onInit = null;
    this.onPeerConnect = null;
    this.onPeerDisconnect = null;
  }

  initialize() {
    if (!window.Peer) {
      console.error(
        'PeerJS library not found. Make sure it is loaded before initializing multiplayer.',
      );
      return;
    }

    // Generate a random ID for this player
    this.playerId = 'player_' + Math.floor(Math.random() * 1000000);

    // Initialize PeerJS
    this.initializePeerJS();
  }

  initializePeerJS() {
    console.log('Initializing PeerJS with ID:', this.playerId);

    // Create a new Peer with our player ID
    console.log('Initializing PeerJS with ID:', this.playerId);

    // Create a new Peer with our player ID and server config
    this.peer = new Peer(this.playerId, {
      host: '172.16.15.127', // Your server address
      port: 9000, // Your server port
      path: '/', // The path on your server
    });

    // Handle successful connection to the PeerJS server
    this.peer.on('open', (id) => {
      console.log('Connected to PeerJS server with ID:', id);
      this.isConnected = true;

      // Call the onInit callback if provided
      if (typeof this.onInit === 'function') {
        this.onInit(id);
      }
    });

    // Handle incoming connections
    this.peer.on('connection', (conn) => {
      this.handleConnection(conn);
    });

    // Handle errors
    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });
  }

  connectToPeer(peerId) {
    // Check if we're already connected to this peer
    if (this.connections[peerId]) {
      console.log('Already connected to peer:', peerId);
      return;
    }

    // Check if we're trying to connect to ourselves
    if (peerId === this.playerId) {
      console.log('Cannot connect to yourself');
      return;
    }

    console.log('Connecting to peer:', peerId);

    // Connect to the peer
    const conn = this.peer.connect(peerId, {
      reliable: true,
    });

    if (conn) {
      this.handleConnection(conn);
    } else {
      console.error('Failed to create connection to peer:', peerId);
    }
  }

  handleConnection(conn) {
    console.log('New connection:', conn.peer);

    // Handle connection opening
    conn.on('open', () => {
      console.log('Connection established with peer:', conn.peer);

      // Store the connection
      this.connections[conn.peer] = conn;

      // Log the current connections
      this.logConnections();

      // Call the onPeerConnect callback if provided
      if (typeof this.onPeerConnect === 'function') {
        this.onPeerConnect(conn.peer);
      }
    });

    // Handle data received from this peer
    conn.on('data', (data) => {
      console.log('Received data from peer:', conn.peer, data);
    });

    // Handle connection closing
    conn.on('close', () => {
      console.log('Connection closed with peer:', conn.peer);
      this.removeConnection(conn.peer);
    });

    // Handle connection errors
    conn.on('error', (err) => {
      console.error('Connection error with peer:', conn.peer, err);
      this.removeConnection(conn.peer);
    });
  }

  removeConnection(peerId) {
    // Remove the connection
    delete this.connections[peerId];

    console.log('Removed connection to peer:', peerId);
    this.logConnections();

    // Call the onPeerDisconnect callback if provided
    if (typeof this.onPeerDisconnect === 'function') {
      this.onPeerDisconnect(peerId);
    }
  }

  logConnections() {
    const peerIds = Object.keys(this.connections);
    console.log('Current connections:', peerIds.length);
    peerIds.forEach((peerId, index) => {
      console.log(`  ${index + 1}. ${peerId}`);
    });
  }

  // Method to join a specific room (using a common peerId pattern)
  joinRoom(roomId) {
    if (!roomId) return;

    // A simple approach: roomId becomes a prefix for all peers in that room
    const roomPeerId = roomId + '_' + Math.floor(Math.random() * 1000000);

    // Disconnect current peer if it exists
    if (this.peer) {
      // Clean up existing connections
      Object.keys(this.connections).forEach((peerId) => {
        this.removeConnection(peerId);
      });

      // Destroy the peer
      this.peer.destroy();
    }

    // Create a new peer with the room-specific ID
    this.playerId = roomPeerId;
    this.initializePeerJS();

    console.log('Joined room:', roomId, 'with ID:', roomPeerId);
  }

  // Clean up the multiplayer service
  cleanup() {
    // Clean up connections
    Object.keys(this.connections).forEach((peerId) => {
      this.removeConnection(peerId);
    });

    // Destroy the peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    console.log('Multiplayer service cleaned up');
  }
}
