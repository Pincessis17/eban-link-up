import { SenderNav } from "@/components/SenderNav";
import BookingForm from "@/components/BookingForm";
import { AvailableTrips } from "@/components/AvailableTrips";

const SenderNewRequest = () => (
  <div className="min-h-screen bg-background">
    <SenderNav />
    <AvailableTrips basePath="/sender/new-request" />
    <BookingForm />
  </div>
);

export default SenderNewRequest;
