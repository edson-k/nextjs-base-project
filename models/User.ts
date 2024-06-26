import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    recoveryCode?: string;
    active?: boolean;
    lastIp?: string;
    lastConnection?: string;
    toJSON(): any;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        twoFactorEnabled: { type: Boolean, required: false, default: false },
        twoFactorSecret: { type: String, required: false },
        recoveryCode: { type: String, required: false },
        active: { type: Boolean, required: false, default: false },
        lastIp: { type: String, required: false },
        lastConnection: { type: String, required: false },
    },
    {
        toObject: {
            transform: function (doc: any, ret: any) {
                delete ret._id;
            },
        },
        toJSON: {
            transform: function (doc: any, ret: any) {
                delete ret._id;
            },
        },
    }
);

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
