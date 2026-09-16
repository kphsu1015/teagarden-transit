import mongoose, { Schema, Document, Model } from "mongoose";

/** 中英文文字（zh-CN 顯示時會 fallback 到 zh） */
export interface ILocalizedText {
  zh: string;
  en: string;
}

export interface ILocalizedTextOptional {
  zh?: string;
  en?: string;
}

export interface IMarker {
  title: ILocalizedText;
  description?: ILocalizedTextOptional;
  /** 圖片上的水平位置，0–100，對應圖片寬度的百分比 */
  xPercent: number;
  /** 圖片上的垂直位置，0–100，對應圖片高度的百分比 */
  yPercent: number;
}

export interface ITripMap extends Document {
  title: string;
  imageUrl: string;
  markers: IMarker[];
  createdAt: Date;
}

const MarkerSchema = new Schema<IMarker>(
  {
    title: {
      zh: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    description: {
      zh: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    xPercent: { type: Number, required: true, min: 0, max: 100 },
    yPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const TripMapSchema = new Schema<ITripMap>({
  title: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true },
  markers: { type: [MarkerSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const TripMap: Model<ITripMap> =
  mongoose.models.TripMap || mongoose.model<ITripMap>("TripMap", TripMapSchema);

export default TripMap;
