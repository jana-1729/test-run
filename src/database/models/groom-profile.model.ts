import mongoose, { Document, Model, Schema } from 'mongoose';
import { JathagamExtraction } from '../../schemas/jathagam.schema.js';

export interface IGroomProfile extends Document {
  version: number;
  extractedData: JathagamExtraction;
  originalFileReference: string;
  active: boolean;
  extractionStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  geminiModel?: string;
  activatedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroomProfileModel extends Model<IGroomProfile> {
  getActiveProfile(): Promise<IGroomProfile | null>;
  activateNewVersion(
    extractedData: JathagamExtraction,
    originalFileReference: string,
    activatedBy: number,
    geminiModel?: string
  ): Promise<IGroomProfile>;
}

const GroomProfileSchema = new Schema<IGroomProfile, IGroomProfileModel>(
  {
    version: { type: Number, required: true, unique: true },
    extractedData: { type: Schema.Types.Mixed, required: true },
    originalFileReference: { type: String, required: true },
    active: { type: Boolean, default: false },
    extractionStatus: {
      type: String,
      enum: ['PENDING', 'VALIDATED', 'FAILED'],
      default: 'PENDING',
    },
    geminiModel: { type: String },
    activatedBy: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

// Partial unique index ensuring ONLY ONE active groom profile exists at any given time
GroomProfileSchema.index(
  { active: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

GroomProfileSchema.statics.getActiveProfile = async function (): Promise<IGroomProfile | null> {
  return this.findOne({ active: true, extractionStatus: 'VALIDATED' }).exec();
};

GroomProfileSchema.statics.activateNewVersion = async function (
  extractedData: JathagamExtraction,
  originalFileReference: string,
  activatedBy: number,
  geminiModel?: string
): Promise<IGroomProfile> {
  const session = await mongoose.startSession().catch(() => null);

  const perform = async (sess?: mongoose.ClientSession) => {
    // 1. Get current highest version
    const last = await this.findOne({}, {}, { sort: { version: -1 }, session: sess }).exec();
    const nextVersion = last ? last.version + 1 : 1;

    // 2. Deactivate any currently active profile
    await this.updateMany({ active: true }, { $set: { active: false } }, { session: sess }).exec();

    // 3. Create and activate the new profile
    const newProfile = new this({
      version: nextVersion,
      extractedData,
      originalFileReference,
      active: true,
      extractionStatus: 'VALIDATED',
      geminiModel,
      activatedBy,
    });

    return newProfile.save({ session: sess });
  };

  if (session) {
    try {
      session.startTransaction();
      const res = await perform(session);
      await session.commitTransaction();
      return res;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  } else {
    return perform();
  }
};

export const GroomProfile = mongoose.model<IGroomProfile, IGroomProfileModel>(
  'GroomProfile',
  GroomProfileSchema,
  'groom_profiles'
);
