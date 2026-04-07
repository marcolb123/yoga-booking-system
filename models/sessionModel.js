
// models/sessionModel.js
import { sessionsDb } from './_db.js';

export const SessionModel = {
  async create(session) {
    return sessionsDb.insert(session);
  },
  async listByCourse(courseId) {
    return sessionsDb.find({ courseId }).sort({ startDateTime: 1 });
  },
  async findById(id) {
    return sessionsDb.findOne({ _id: id });
  },
  async incrementBookedCount(id, delta = 1) {
    const s = await this.findById(id);
    if (!s) throw new Error('Session not found');
    const next = (s.bookedCount ?? 0) + delta;
    if (next < 0) throw new Error('Booked count cannot be negative');
    if (delta > 0 && (s.bookedCount ?? 0) >= (s.capacity ?? 0)) {
      throw new Error('Session is fully booked');
    }
    await sessionsDb.update({ _id: id }, { $set: { bookedCount: next } });
    return this.findById(id);
  },
  async deleteByCourse(courseId) {
    return sessionsDb.remove({ courseId }, { multi: true });
  },
  async update(id, patch) {
    await sessionsDb.update({ _id: id }, { $set: patch });
    return this.findById(id);
  },
  async delete(id) {
    return sessionsDb.remove({ _id: id });
  },
  async listByIds(ids) {
    return sessionsDb.find({ _id: { $in: ids } });
  },
};
