import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star, ShieldCheck, Package, Plane, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";
import { SenderNav } from "@/components/SenderNav";
import { TravelerNav } from "@/components/TravelerNav";
import { AdminNav } from "@/components/AdminNav";

type ProfileData = {
  user_id: string; first_name: string; full_name: string | null; is_self: boolean; avg_rating: number | null;
  rating_count: number; parcels_sent: number; parcels_carried: number; verified: boolean; member_since: string | null;
};
type Review = { rating: number; comment: string | null; created_at: string; reviewer_first_name: string; reviewer_role: string; route: string };

const Stars = ({ value, size = "w-4 h-4" }: { value: number; size?: string }) => (
  <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-gold text-gold" : "text-border"}`} />
    ))}
  </span>
);

const Profile = () => {
  const { userId } = useParams();
  const { user, profile: me } = useAuth();
  const id = userId ?? user?.id;
  const [data, setData] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.rpc("get_profile", { p_user_id: id }),
      supabase.rpc("get_reviews", { p_user_id: id }),
    ]);
    setData(p?.[0] ?? null);
    setReviews(r ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data?.is_self) {
      setName(me?.full_name ?? data.full_name ?? "");
      setPhone(me?.phone ?? "");
    }
  }, [data?.is_self, data?.full_name, me?.full_name, me?.phone]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null, phone: phone.trim() || null }).eq("id", user.id);
    // Keep the traveller row's display name in step so other people see the same name.
    await supabase.from("traveller_profiles").update({ name: name.trim() || null }).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast({ title: "Couldn't save", description: errMsg(error), variant: "destructive" });
    toast({ title: "Profile saved" });
    load();
  };

  const Nav = me?.role === "Admin" ? AdminNav : me?.role === "Traveller" ? TravelerNav : SenderNav;
  const own = data?.is_self;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        {loading && <p className="font-body text-sm text-muted-foreground">Loading...</p>}
        {!loading && !data && (
          <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">
            This profile isn't available. You can see the profile of someone you have a request with.
          </p>
        )}

        {data && (
          <>
            <div className="bg-card rounded-3xl border border-border/80 p-8 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-body text-[10px] uppercase font-semibold tracking-widest text-gold-dark">{own ? "Your profile" : "Profile"}</p>
                  <h1 className="font-display text-3xl font-medium text-foreground">{own ? data.full_name ?? data.first_name : data.first_name}</h1>
                  <p className="font-body text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    {data.member_since && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" /> Member since {new Date(data.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className={`w-3.5 h-3.5 ${data.verified ? "text-emerald-600" : "text-amber-500"}`} />
                      {data.verified ? "ID verified traveler" : "No ID verification"}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  {data.rating_count > 0 ? (
                    <>
                      <p className="font-display text-4xl font-medium text-foreground leading-none">{Number(data.avg_rating).toFixed(1)}</p>
                      <Stars value={Number(data.avg_rating)} />
                      <p className="font-body text-xs text-muted-foreground mt-1">{data.rating_count} review{data.rating_count === 1 ? "" : "s"}</p>
                    </>
                  ) : (
                    <p className="font-body text-sm text-muted-foreground">No reviews yet</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
                  <Package className="w-5 h-5 text-gold-dark" />
                  <div>
                    <p className="font-display text-xl font-semibold text-foreground">{data.parcels_sent}</p>
                    <p className="font-body text-xs text-muted-foreground">Parcels sent</p>
                  </div>
                </div>
                <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
                  <Plane className="w-5 h-5 text-gold-dark" />
                  <div>
                    <p className="font-display text-xl font-semibold text-foreground">{data.parcels_carried}</p>
                    <p className="font-body text-xs text-muted-foreground">Parcels delivered</p>
                  </div>
                </div>
              </div>
            </div>

            {own && (
              <form onSubmit={save} className="bg-card rounded-3xl border border-border/80 p-8 shadow-[var(--shadow-card)] mt-6 space-y-4">
                <h2 className="font-display text-xl font-medium text-foreground">Your details</h2>
                <p className="font-body text-xs text-muted-foreground">
                  Other people only see your first name. Your phone number is shared with the other person only after a request is paid, for the handover.
                </p>
                <div>
                  <label htmlFor="pf-name" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Full name</label>
                  <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label htmlFor="pf-phone" className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Phone number (with country code)</label>
                  <input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+230 5xxx xxxx" className="w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="font-body text-xs text-muted-foreground">Signed in as {user?.email}</p>
                  <button disabled={saving} className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}

            <h2 className="font-display text-xl font-medium text-foreground mt-10 mb-3">Reviews</h2>
            <div className="grid gap-3">
              {reviews.length === 0 && (
                <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">
                  {own ? "Reviews from the people you deal with will show here after a delivery is completed." : "No reviews yet."}
                </p>
              )}
              {reviews.map((r, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Stars value={r.rating} />
                    <span className="font-body text-xs text-muted-foreground">
                      {r.reviewer_first_name} ({r.reviewer_role === "sender" ? "sender" : "traveler"}) · {r.route} · {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {r.comment && <p className="font-body text-sm text-foreground mt-3 whitespace-pre-wrap">{r.comment}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
