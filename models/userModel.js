
// models/userModel.js
import { usersDb } from './_db.js';

export const UserModel = {
  async create(user) {
    return usersDb.insert(user);
  },
  async findByEmail(email) {
    return usersDb.findOne({ email });
  },
  async findById(id) {
    return usersDb.findOne({ _id: id });
  },
  async list() {
    return usersDb.find({});
  },
  async listByRole(role) {
    return usersDb.find({ role });
  },
  async update(id, patch) {
    await usersDb.update({ _id: id }, { $set: patch });
    return this.findById(id);
  },
  async delete(id) {
    return usersDb.remove({ _id: id });
  },
};
