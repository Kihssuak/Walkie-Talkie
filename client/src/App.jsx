
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function App() {
    const [roomId, setRoomId] = useState('');
    const [nickname, setNickname] = useState('');
    const [joined, setJoined] = useState(false);
    const [status, setStatus] = useState('Not connected');
    const socketRef = useRef(null);
    const peersRef = useRef({});
    const localStreamRef = useRef(null);

    const handleJoin = async () => {
        if (!roomId || !nickname) {
            alert("Please enter both Room ID and Nickname.");
            return;
        }
        socketRef.current = io(SERVER_URL);
        socketRef.current.emit('join', { roomId, nickname });
        setStatus(`Joined room: ${roomId}`);
        setJoined(true);

        socketRef.current.on('user-joined', ({ id, nickname }) => {
            setStatus(`${nickname} joined the room`);
            callUser(id);
        });

        socketRef.current.on('user-left', ({ nickname }) => {
            setStatus(`${nickname} left the room`);
        });

        socketRef.current.on('signal', async ({ from, data }) => {
            if (!peersRef.current[from]) {
                await answerCall(from);
            }
            peersRef.current[from].signal(data);
        });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        localStreamRef.current.getAudioTracks()[0].enabled = false;
    };

    const callUser = (id) => {
        const SimplePeer = (window.SimplePeer || require('simple-peer'));
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: localStreamRef.current
        });

        peer.on('signal', data => {
            socketRef.current.emit('signal', { to: id, data });
        });

        peer.on('stream', stream => {
            const audio = new Audio();
            audio.srcObject = stream;
            audio.play();
        });

        peersRef.current[id] = peer;
    };

    const answerCall = async (id) => {
        const SimplePeer = (window.SimplePeer || require('simple-peer'));
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: localStreamRef.current
        });

        peer.on('signal', data => {
            socketRef.current.emit('signal', { to: id, data });
        });

        peer.on('stream', stream => {
            const audio = new Audio();
            audio.srcObject = stream;
            audio.play();
        });

        peersRef.current[id] = peer;
    };

    const handleTalkStart = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks()[0].enabled = true;
            setStatus(`🔊 ${nickname} is talking...`);
        }
    };

    const handleTalkEnd = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks()[0].enabled = false;
            setStatus(`Connected in room: ${roomId}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-4">🚀 Advanced WebRTC Walkie-Talkie</h1>

            {!joined ? (
                <div className="flex flex-col space-y-3 w-full max-w-sm">
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="p-2 rounded text-black"
                    />
                    <input
                        type="text"
                        placeholder="Enter Nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="p-2 rounded text-black"
                    />
                    <button
                        onClick={handleJoin}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Join Room
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-5">
                    <p className="text-lg">{status}</p>
                    <button
                        onMouseDown={handleTalkStart}
                        onMouseUp={handleTalkEnd}
                        onTouchStart={handleTalkStart}
                        onTouchEnd={handleTalkEnd}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full text-xl"
                    >
                        Hold to Talk
                    </button>
                </div>
            )}
        </div>
    );
}
