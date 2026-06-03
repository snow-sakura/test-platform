"""WebSocket 连接管理器"""
from fastapi import WebSocket


class ConnectionManager:
    """FastAPI WebSocket 连接管理器"""

    def __init__(self):
        # client_id -> WebSocket
        self.active_connections: dict[str, WebSocket] = {}
        # client_id -> set of rooms
        self.client_rooms: dict[str, set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """接受 WebSocket 连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_rooms[client_id] = set()

    def disconnect(self, client_id: str):
        """断开连接"""
        self.active_connections.pop(client_id, None)
        self.client_rooms.pop(client_id, None)

    def join_room(self, client_id: str, room: str):
        """加入房间"""
        if client_id in self.client_rooms:
            self.client_rooms[client_id].add(room)

    def leave_room(self, client_id: str, room: str):
        """离开房间"""
        if client_id in self.client_rooms:
            self.client_rooms[client_id].discard(room)

    async def send_message(self, client_id: str, message: dict):
        """发送消息给指定客户端"""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, message: dict, room: str | None = None):
        """广播消息（可选限制到某个房间）"""
        for client_id, ws in list(self.active_connections.items()):
            if room and room not in self.client_rooms.get(client_id, set()):
                continue
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(client_id)


# 全局 WebSocket 管理器
ws_manager = ConnectionManager()
