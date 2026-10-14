import { Link } from "react-router-dom";
import { SenderNav } from "@/components/SenderNav";
import BookingForm from "@/components/BookingForm";

const SenderNewRequest = () => (
  <div className="min-h-screen bg-background">
    <SenderNav />
    <div className="container mx-auto px-6 pt-8 max-w-3xl">
      <div className="bg-gold/10 border border-gold/25 rounded-2xl p-4 font-body text-xs text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span>Prefer to choose your traveler? Browse trips on your route and book space directly.</span>
        <Link to="/sender/trips" className="bg-earth text-gold-light font-semibold uppercase tracking-wider px-4 py-2 rounded-xl whitespace-nowrap">
          Browse trips
        </Link>
      </div>
    </div>
    <BookingForm />
  </div>
);

export default SenderNewRequest;
