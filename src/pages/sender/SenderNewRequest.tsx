import { SenderNav } from "@/components/SenderNav";
import BookingForm from "@/components/BookingForm";
import { AvailableTrips } from "@/components/AvailableTrips";

const SenderNewRequest = () => (
  <div className="min-h-screen bg-background">
    <SenderNav />
    <AvailableTrips />
    <BookingForm />
  </div>
);

export default SenderNewRequest;
