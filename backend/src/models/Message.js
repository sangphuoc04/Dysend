import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Conversation',
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    content: {
        type: String,
        trim: true,
    },
    imgUrl: {
        type: String,
    }
}, {
    timestamps: true,
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
const Message = mongoose.model('Message', messageSchema);
export default Message;