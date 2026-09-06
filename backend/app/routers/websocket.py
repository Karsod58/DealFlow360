"""
WebSocket API for real-time updates
Broadcasts events to connected clients when quotations, approvals, fulfillment, or billing changes occur
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import List, Dict, Optional
import json
import asyncio
from datetime import datetime

from app.auth import verify_token
from app.models import UserRole


router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        # Store connections by user_id for targeted notifications
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Store all connections for broadcast
        self.all_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.all_connections.append(websocket)
        
        print(f"WebSocket connected: user_id={user_id}, total_connections={len(self.all_connections)}")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # Clean up empty user lists
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        if websocket in self.all_connections:
            self.all_connections.remove(websocket)
        
        print(f"WebSocket disconnected: user_id={user_id}, total_connections={len(self.all_connections)}")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to specific user's connections"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def broadcast(self, message: dict, exclude_user_id: Optional[int] = None):
        """Broadcast message to all connected clients (optionally exclude sender)"""
        disconnected = []
        
        for connection in self.all_connections:
            # Find which user this connection belongs to
            user_id = None
            for uid, conns in self.active_connections.items():
                if connection in conns:
                    user_id = uid
                    break
            
            # Skip if this is the excluded user
            if exclude_user_id and user_id == exclude_user_id:
                continue
            
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")
                disconnected.append((connection, user_id))
        
        # Clean up disconnected connections
        for conn, uid in disconnected:
            if uid:
                self.disconnect(conn, uid)
    
    async def broadcast_to_roles(self, message: dict, roles: List[UserRole], exclude_user_id: Optional[int] = None):
        """Broadcast message to users with specific roles"""
        # For now, broadcast to all (role filtering would require storing user role with connection)
        # In production, enhance ConnectionManager to track user roles
        await self.broadcast(message, exclude_user_id)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time updates
    Client must provide JWT token as query parameter: /ws?token=<jwt_token>
    """
    
    # Authenticate the connection
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=4002, reason="Invalid token")
            return
        
        user_id = int(user_id)
        
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        await websocket.close(code=4003, reason="Authentication failed")
        return
    
    # Connect the client
    await manager.connect(websocket, user_id)
    
    # Send connection confirmation
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    try:
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            
            # Handle ping/pong for keep-alive
            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Echo back for debugging (optional)
                try:
                    message = json.loads(data)
                    print(f"Received from user {user_id}: {message}")
                except json.JSONDecodeError:
                    pass
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)


# ============= Helper functions for broadcasting events =============

async def broadcast_quotation_update(quotation_id: int, action: str, user_id: int, data: dict = None):
    """
    Broadcast quotation updates to all connected clients
    Actions: created, updated, submitted, approved, rejected
    """
    message = {
        "type": "quotation_update",
        "action": action,
        "quotation_id": quotation_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data or {}
    }
    await manager.broadcast(message, exclude_user_id=user_id)


async def broadcast_approval_update(approval_id: int, action: str, user_id: int, data: dict = None):
    """
    Broadcast approval updates
    Actions: pending, approved, rejected, returned
    """
    message = {
        "type": "approval_update",
        "action": action,
        "approval_id": approval_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data or {}
    }
    
    # Broadcast to managers and finance roles
    await manager.broadcast_to_roles(
        message,
        roles=[UserRole.MANAGER, UserRole.FINANCE, UserRole.ADMIN],
        exclude_user_id=user_id
    )


async def broadcast_fulfillment_update(fulfillment_id: int, action: str, user_id: int, data: dict = None):
    """
    Broadcast fulfillment/warehouse updates
    Actions: calculated, accepted, manual_override, shipped
    """
    message = {
        "type": "fulfillment_update",
        "action": action,
        "fulfillment_id": fulfillment_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data or {}
    }
    await manager.broadcast(message, exclude_user_id=user_id)


async def broadcast_invoice_update(invoice_id: int, action: str, user_id: int, data: dict = None):
    """
    Broadcast invoice/billing updates
    Actions: generated, paid, partially_paid, overdue, refunded
    """
    message = {
        "type": "invoice_update",
        "action": action,
        "invoice_id": invoice_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data or {}
    }
    
    # Broadcast to finance and admin roles
    await manager.broadcast_to_roles(
        message,
        roles=[UserRole.FINANCE, UserRole.ADMIN],
        exclude_user_id=user_id
    )


async def broadcast_subscription_update(subscription_id: int, action: str, user_id: int, data: dict = None):
    """
    Broadcast subscription updates
    Actions: created, modified, paused, resumed, cancelled
    """
    message = {
        "type": "subscription_update",
        "action": action,
        "subscription_id": subscription_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data or {}
    }
    await manager.broadcast(message, exclude_user_id=user_id)


async def notify_user(user_id: int, notification_type: str, title: str, message: str, data: dict = None):
    """
    Send notification to specific user
    Used for targeted alerts (e.g., "Your quotation was approved")
    """
    notification = {
        "type": "notification",
        "notification_type": notification_type,  # success, warning, error, info
        "title": title,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data or {}
    }
    await manager.send_personal_message(notification, user_id)
