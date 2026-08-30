import { useMemo, useState } from "react";

const doctors = [
  {
    name: "Dr. Nethmi Perera",
    specialty: "Cardiologist",
    hospital: "Asiri Central Hospital",
    rating: "4.9",
    reviews: "124",
    time: "Today, 6:30 PM",
    initials: "NP",
    color: "bg-rose-100 text-rose-600",
  },
  {
    name: "Dr. Kavindu Silva",
    specialty: "General Physician",
    hospital: "Nawaloka Hospital",
    rating: "4.8",
    reviews: "98",
    time: "Tomorrow, 9:00 AM",
    initials: "KS",
    color: "bg-sky-100 text-sky-600",
  },
  {
    name: "Dr. Malithi Fernando",
    specialty: "Dermatologist",
    hospital: "Lanka Hospitals",
    rating: "4.9",
    reviews: "76",
    time: "Tomorrow, 3:30 PM",
    initials: "MF",
    color: "bg-violet-100 text-violet-600",
  },
];

const specialties = [
  ["🩺", "General Physician"],
  ["❤️", "Cardiologist"],
  ["🧠", "Neurologist"],
  ["👶", "Pediatrician"],
  ["🦷", "Dentist"],
  ["👁️", "Eye Specialist"],
];

export default function App() {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] =
    useState("All specialties");
  const [booking, setBooking] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const term = search.toLowerCase();

      const matchesSearch =
        !term ||
        `${doctor.name} ${doctor.specialty} ${doctor.hospital}`
          .toLowerCase()
          .includes(term);

      const matchesSpecialty =
        selectedSpecialty === "All specialties" ||
        doctor.specialty === selectedSpecialty;

      return matchesSearch && matchesSpecialty;
    });
  }, [search, selectedSpecialty]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a
            href="#home"
            className="flex items-center gap-2 text-xl font-extrabold text-slate-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-xl text-white">
              +
            </span>

            Medi<span className="text-teal-600">Care</span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="hover:text-teal-600" href="#find">
              Find a doctor
            </a>
            <a className="hover:text-teal-600" href="#specialties">
              Specialties
            </a>
            <a className="hover:text-teal-600" href="#how-it-works">
              How it works
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button className="px-3 py-2 text-sm font-semibold text-slate-700">
              Sign in
            </button>

            <button className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              Create account
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-2xl md:hidden"
          >
            ☰
          </button>
        </nav>

        {menuOpen && (
          <div className="space-y-3 border-t bg-white px-5 py-4 text-sm font-medium md:hidden">
            <a className="block" href="#find">
              Find a doctor
            </a>
            <a className="block" href="#specialties">
              Specialties
            </a>
            <a className="block" href="#how-it-works">
              How it works
            </a>
          </div>
        )}
      </header>

      {/* Hero section */}
      <section
        id="home"
        className="overflow-hidden bg-gradient-to-br from-teal-50 via-white to-cyan-50"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
              Your health, made simpler
            </p>

            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Book the right doctor,{" "}
              <span className="text-teal-600">at the right time.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              Find trusted specialists, check availability, and book your
              channel appointment in minutes.
            </p>

            <div className="mt-8 rounded-2xl bg-white p-3 shadow-xl shadow-teal-900/10 ring-1 ring-slate-100 sm:flex">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none placeholder:text-slate-400"
                placeholder="Search doctor, specialty, or hospital"
              />

              <button
                onClick={() =>
                  document
                    .querySelector("#find")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="mt-2 w-full rounded-xl bg-teal-600 px-6 py-3 font-bold text-white transition hover:bg-teal-700 sm:mt-0 sm:w-auto"
              >
                Search doctors
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600">
              <span>
                <b className="text-teal-600">500+</b> verified doctors
              </span>
              <span>
                <b className="text-teal-600">24/7</b> easy booking
              </span>
              <span>
                <b className="text-teal-600">4.8/5</b> patient rating
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-8 rounded-full bg-teal-200/50 blur-3xl" />

            <div className="relative rounded-3xl bg-slate-900 p-7 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-teal-200">Next appointment</p>

                <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-200">
                  Confirmed
                </span>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-100 text-xl font-bold text-teal-700">
                  NP
                </div>

                <div>
                  <h2 className="text-xl font-bold">Dr. Nethmi Perera</h2>
                  <p className="text-sm text-slate-300">
                    Cardiologist · Asiri Central
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 text-sm">
                <div>
                  <p className="text-slate-400">Date</p>
                  <p className="mt-1 font-semibold">30 Aug 2026</p>
                </div>

                <div>
                  <p className="text-slate-400">Time</p>
                  <p className="mt-1 font-semibold">6:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section
        id="specialties"
        className="mx-auto max-w-7xl px-5 py-16 lg:px-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-bold text-teal-600">EXPLORE CARE</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
              Find by specialty
            </h2>
          </div>

          <button
            onClick={() => setSelectedSpecialty("All specialties")}
            className="text-sm font-bold text-teal-600"
          >
            View all →
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {specialties.map(([icon, label]) => (
            <button
              key={label}
              onClick={() => {
                setSelectedSpecialty(label);

                document
                  .querySelector("#find")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-md"
            >
              <span className="text-3xl">{icon}</span>

              <p className="mt-4 text-sm font-bold text-slate-700 group-hover:text-teal-700">
                {label}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Doctors */}
      <section id="find" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-bold text-teal-600">AVAILABLE NOW</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                Book a consultation
              </h2>
            </div>

            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-teal-600"
            >
              <option>All specialties</option>

              {specialties.map(([, label]) => (
                <option key={label}>{label}</option>
              ))}
            </select>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {visibleDoctors.map((doctor) => (
              <article
                key={doctor.name}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-lg"
              >
                <div className="flex gap-4">
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-bold ${doctor.color}`}
                  >
                    {doctor.initials}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      {doctor.name}
                    </h3>

                    <p className="mt-1 text-sm text-teal-700">
                      {doctor.specialty}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {doctor.hospital}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-y border-slate-100 py-4 text-sm">
                  <span className="font-semibold text-amber-500">
                    ★ {doctor.rating}{" "}
                    <span className="font-normal text-slate-400">
                      ({doctor.reviews})
                    </span>
                  </span>

                  <span className="font-semibold text-slate-600">
                    {doctor.time}
                  </span>
                </div>

                <button
                  onClick={() => setBooking(doctor)}
                  className="mt-5 w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
                >
                  Book appointment
                </button>
              </article>
            ))}
          </div>

          {visibleDoctors.length === 0 && (
            <p className="py-10 text-center text-slate-500">
              No doctors found. Try another search or specialty.
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-5xl px-5 py-16 text-center"
      >
        <p className="font-bold text-teal-600">SIMPLE AND SECURE</p>

        <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
          Get care in three easy steps
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["01", "Search", "Choose a specialty, doctor, or hospital."],
            ["02", "Book", "Select a convenient date and time slot."],
            ["03", "Visit", "Receive confirmation and meet your doctor."],
          ].map(([number, title, text]) => (
            <div key={number}>
              <span className="text-5xl font-black text-teal-100">
                {number}
              </span>

              <h3 className="mt-3 text-lg font-bold">{title}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-900 px-5 py-8 text-center text-sm text-slate-400">
        © 2026 MediCare. Your trusted healthcare booking partner.
      </footer>

      {/* Booking modal */}
      {booking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <button
              onClick={() => setBooking(null)}
              className="float-right text-xl text-slate-400"
            >
              ×
            </button>

            <p className="font-bold text-teal-600">APPOINTMENT BOOKING</p>

            <h2 className="mt-2 text-2xl font-extrabold">
              Confirm your channel
            </h2>

            <div className="mt-6 rounded-xl bg-teal-50 p-4 text-sm">
              <p className="font-bold">{booking.name}</p>

              <p className="mt-1 text-slate-600">
                {booking.specialty} · {booking.time}
              </p>
            </div>

            <label className="mt-5 block text-sm font-bold">
              Patient name

              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-teal-600"
                placeholder="Enter your full name"
              />
            </label>

            <button
              onClick={() => {
                alert(`Booking request sent for ${booking.name}!`);
                setBooking(null);
              }}
              className="mt-5 w-full rounded-xl bg-teal-600 py-3 font-bold text-white hover:bg-teal-700"
            >
              Confirm booking
            </button>
          </div>
        </div>
      )}
    </main>
  );
}