import mongoose from 'mongoose';
const { Schema } = mongoose;

const ActivitySchema = new Schema({
  type: { type: String, required: true },      // 'project' | 'task'
  action: { type: String, required: true },    // 'created', 'updated', 'deleted'
  targetType: { type: String, required: true },// 'project' or 'task'
  targetName: { type: String, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('Activity', ActivitySchema);
