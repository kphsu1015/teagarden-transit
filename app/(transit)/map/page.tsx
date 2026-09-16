import dbConnect from "@/lib/dbConnect";
import TripMap from "@/models/TripMap";
import MapView, { type MapViewData } from "../../components/MapView";

export const dynamic = "force-dynamic";

async function getTripMap(): Promise<MapViewData | null> {
  await dbConnect();

  const doc = await TripMap.findOne().sort({ createdAt: -1 }).lean();
  if (!doc) return null;

  return {
    title: doc.title,
    imageUrl: doc.imageUrl,
  };
}

export default async function MapPage() {
  const tripMap = await getTripMap();
  return <MapView tripMap={tripMap} />;
}
