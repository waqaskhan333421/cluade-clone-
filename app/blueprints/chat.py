import json
from flask import Blueprint, request, jsonify, Response, current_app
from app.database import db
from app.models import Conversation, Message
from app.registry import get_provider_and_model

chat_bp = Blueprint('chat', __name__)

# --- Conversation CRUD ---

@chat_bp.route('/api/conversations', methods=['GET'])
def get_conversations():
    """
    List all conversations ordered by creation date descending.
    """
    conversations = Conversation.query.order_by(Conversation.created_at.desc()).all()
    return jsonify([conv.to_dict() for conv in conversations])

@chat_bp.route('/api/conversations', methods=['POST'])
def create_conversation():
    """
    Create a new conversation thread.
    """
    data = request.json or {}
    model_id = data.get("model_id")
    title = data.get("title", "New Chat")
    
    if not model_id:
        return jsonify({"error": "model_id is required"}), 400
        
    conversation = Conversation(title=title, model_id=model_id)
    db.session.add(conversation)
    db.session.commit()
    
    return jsonify(conversation.to_dict()), 201

@chat_bp.route('/api/conversations/<id>', methods=['GET'])
def get_conversation(id):
    """
    Get conversation details and all associated messages.
    """
    conversation = Conversation.query.get(id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
        
    messages = Message.query.filter_by(conversation_id=id).order_by(Message.created_at.asc()).all()
    
    return jsonify({
        "conversation": conversation.to_dict(),
        "messages": [msg.to_dict() for msg in messages]
    })

@chat_bp.route('/api/conversations/<id>', methods=['PUT'])
def update_conversation(id):
    """
    Update a conversation title.
    """
    conversation = Conversation.query.get(id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
        
    data = request.json or {}
    new_title = data.get("title")
    if not new_title:
        return jsonify({"error": "title is required"}), 400
        
    conversation.title = new_title
    db.session.commit()
    return jsonify(conversation.to_dict())

@chat_bp.route('/api/conversations/<id>', methods=['DELETE'])
def delete_conversation(id):
    """
    Delete a conversation and all its messages (cascade delete is active).
    """
    conversation = Conversation.query.get(id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
        
    db.session.delete(conversation)
    db.session.commit()
    return jsonify({"success": True, "message": "Conversation deleted successfully"})

# --- Chat Streaming Endpoint ---

@chat_bp.route('/api/chat', methods=['POST'])
def chat_stream():
    """
    POST route to stream responses from selected LLMs.
    Saves user prompt immediately, streams back tokens via Server-Sent Events,
    and commits the complete assistant response to the SQLite database on finish.
    """
    data = request.json or {}
    conversation_id = data.get("conversation_id")
    model_id = data.get("model_id")
    content = data.get("content")
    custom_model = data.get("custom_model")
    
    if not conversation_id or not model_id or not content:
        return jsonify({"error": "Missing conversation_id, model_id, or content"}), 400
        
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
        
    # 1. Save user prompt
    user_message = Message(conversation_id=conversation_id, role="user", content=content)
    db.session.add(user_message)
    db.session.commit()
    
    # 2. Check if title is default 'New Chat' and update dynamically
    if conversation.title == "New Chat":
        # Make a quick user-friendly title
        title_candidate = content.strip().split("\n")[0]
        if len(title_candidate) > 40:
            title_candidate = title_candidate[:40] + "..."
        conversation.title = title_candidate
        db.session.commit()
        
    # 3. Fetch history for API context
    history_messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at.asc()).all()
    payload = [{"role": msg.role, "content": msg.content} for msg in history_messages]
    
    # 4. Resolve provider and model name
    try:
        provider, real_model = get_provider_and_model(model_id, custom_model)
    except Exception as e:
        return jsonify({"error": f"Configuration Error: {str(e)}"}), 400
        
    # Get current application for closure DB operations
    app = current_app._get_current_object()
    
    def event_generator():
        assistant_tokens = []
        with app.app_context():
            try:
                # Stream from concrete provider adapter
                for token in provider.stream_chat(payload, real_model):
                    assistant_tokens.append(token)
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    
                # Save assistant response on completion
                full_response = "".join(assistant_tokens)
                assistant_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response
                )
                db.session.add(assistant_message)
                db.session.commit()
                
                # Query conversation within current session context to avoid detached instance errors
                current_conv = Conversation.query.get(conversation_id)
                conv_title = current_conv.title if current_conv else "Chat"

                # Signal successful stream end
                yield f"data: {json.dumps({
                    'type': 'done',
                    'message': assistant_message.to_dict(),
                    'conversation_title': conv_title
                })}\n\n"
                
            except Exception as e:
                # Catch and yield errors cleanly so frontend can render them gracefully
                import traceback
                traceback.print_exc()
                error_msg = str(e)
                yield f"data: {json.dumps({'type': 'error', 'content': f'Provider Error: {error_msg}'})}\n\n"
                
    return Response(event_generator(), mimetype='text/event-stream')
