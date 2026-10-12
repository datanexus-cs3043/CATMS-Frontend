import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { clinicPhotos } from '../components/HeroSlider';
import api, { apiErrorMessage, type ClinicDirectory } from '../services/api';

// Non-technical summary slide content
const SLIDES = [
  {
    tag: 'Welcome to MedSync CATMS',
    title: 'Modern Clinic Channeling & Healthcare Management',
    desc: 'Connecting patients, medical specialists, and clinic branches across Colombo, Kandy, and Galle for seamless appointments, trusted consultations, and transparent care.',
    badge: 'Multi-Branch Network',
  },
  {
    tag: 'Fast & Reliable Channeling',
    title: 'Find Your Specialist & Arrange Your Visit',
    desc: 'Explore medical specialties and contact clinic reception to arrange a consultation or ask about same-day walk-in care.',
    badge: 'Reception-Assisted Booking',
  },
  {
    tag: 'Unified Health Records',
    title: 'One Complete Patient Record, Everywhere You Go',
    desc: 'Registered in Galle, consulting in Colombo, or visiting in Kandy — your consultation notes, diagnoses, treatment history, and emergency contacts stay unified and secure across our network.',
    badge: '100% Digital Records',
  },
  {
    tag: 'Transparent Billing & Claims',
    title: 'Clear, Itemized Invoices & Insurance Claim Tracking',
    desc: 'Consultations and procedures are itemized from a standardized service catalog. View your bills and ask reception about insurance policies and claim status.',
    badge: 'Transparent Claims',
  },
];

const FEATURES = [
  {
    icon: '🩺',
    title: 'Specialist Channeling',
    desc: 'Find medical practitioners across multiple disciplines. Clinic reception helps arrange appointments with the appropriate doctor and branch.',
  },
  {
    icon: '🏥',
    title: 'Walk-In & Emergency Care',
    desc: 'Need urgent consultation? Front-desk receptionists can register walk-in patients on the spot, finding an available slot in the doctor roster.',
  },
  {
    icon: '📋',
    title: 'Centralized Health Profiles',
    desc: 'A single, unified medical record for each patient. Stores demographics, emergency contacts, and insurance details accessible at any MedSync branch.',
  },
  {
    icon: '💊',
    title: 'Consultations & Treatments',
    desc: 'Doctors securely log clinical observations, diagnoses, and medical advice, selecting performed treatments directly from the clinic service catalog.',
  },
  {
    icon: '🧾',
    title: 'Itemized, Fair Invoicing',
    desc: 'Invoices are generated from the recorded treatments rendered during your visit, showing itemized quantities and prices.',
  },
  {
    icon: '🛡️',
    title: 'Integrated Health Insurance',
    desc: 'Keep insurance policy numbers and terms on file. Clinic staff manage claims against invoices and track pending, approved and rejected outcomes.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Find Your Specialist & Branch',
    desc: 'Search the medical directory by specialty, doctor name, or preferred branch in Colombo, Kandy, or Galle.',
  },
  {
    num: '02',
    title: 'Contact Reception or Visit Walk-In',
    desc: 'Ask clinic reception to book, cancel or reschedule your appointment. Visit a clinic front desk for patient registration and walk-in assistance.',
  },
  {
    num: '03',
    title: 'Consult & Settle Transparently',
    desc: 'Meet your doctor, receive medical care, review your appointment history, and settle an itemized bill with clinic reception.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [directory, setDirectory] = useState<ClinicDirectory | null>(null);
  const [directoryError, setDirectoryError] = useState('');
  const [directoryAttempt, setDirectoryAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDirectoryError('');
    api.get<ClinicDirectory>('/public/clinic-directory', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setDirectory(data); })
      .catch(error => {
        if (!controller.signal.aborted) {
          setDirectoryError(apiErrorMessage(error, 'Clinic information could not be loaded.'));
        }
      });
    return () => controller.abort();
  }, [directoryAttempt]);

  const touchStartX = useRef<number | null>(null);

  const photos = clinicPhotos.length > 0 ? clinicPhotos : [];
  const slideCount = SLIDES.length;

  const nextSlide = useCallback(() => {
    setSlideIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setSlideIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(nextSlide, 5500);
    return () => window.clearInterval(timer);
  }, [isPaused, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  const currentSlide = SLIDES[slideIndex];

  return (
    <div className="landing-page-root">
      {/* ── Top Public Navigation Bar ────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-brand-mark" aria-hidden />
            <div>
              <div className="landing-brand-name">MedSync</div>
              <div className="landing-brand-sub">Clinic Appointment & Treatment Management System</div>
            </div>
          </div>

          <nav className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>System Capabilities</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#branches" onClick={() => setMobileMenuOpen(false)}>Our Branches</a>
            <a href="#specialties" onClick={() => setMobileMenuOpen(false)}>Specialties</a>
          </nav>

          <div className="landing-header-actions">
            {isAuthenticated ? (
              <div className="landing-user-badge">
                <span className="landing-user-text">
                  Signed in as <strong>{user?.first_name || user?.username}</strong>
                </span>
                <button
                  className="landing-btn landing-btn-primary"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard →
                </button>
                <button
                  className="landing-btn landing-btn-ghost"
                  onClick={logout}
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="landing-auth-buttons">
                <button
                  className="landing-btn landing-btn-ghost"
                  onClick={() => navigate('/login')}
                >
                  Sign in
                </button>
                <button
                  className="landing-btn landing-btn-primary"
                  onClick={() => navigate('/login?tab=register')}
                >
                  Patient Account Help
                </button>
              </div>
            )}

            <button
              className="landing-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section with Image Slideshow ──────────────────── */}
      <section
        className="landing-hero"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-roledescription="carousel"
        aria-label="MedSync clinic showcase"
      >
        {/* Background Slides */}
        {photos.length > 0 ? (
          photos.map((photo, i) => (
            <div
              key={photo}
              className={`landing-hero-bg-slide ${i === slideIndex % photos.length ? 'active' : ''}`}
            >
              <img src={photo} alt="MedSync Healthcare Clinic" loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          ))
        ) : (
          <div className="landing-hero-bg-pattern active" />
        )}

        <div className="landing-hero-overlay" />

        {/* Hero Content Overlay */}
        <div className="landing-hero-container">
          <div className="landing-hero-content" key={slideIndex}>
            <div className="landing-hero-badge">
              <span className="landing-badge-dot" />
              <span>{currentSlide.badge}</span>
            </div>
            <div className="landing-hero-eyebrow">{currentSlide.tag}</div>
            <h1 className="landing-hero-title">{currentSlide.title}</h1>
            <p className="landing-hero-desc">{currentSlide.desc}</p>

            <div className="landing-hero-cta">
              {isAuthenticated ? (
                <>
                  <button
                    className="landing-btn landing-btn-lg landing-btn-primary"
                    onClick={() => navigate('/dashboard')}
                  >
                    Open Clinical Dashboard
                  </button>
                  <a href="#features" className="landing-btn landing-btn-lg landing-btn-outline-white">
                    Explore System Capabilities
                  </a>
                </>
              ) : (
                <>
                  <button
                    className="landing-btn landing-btn-lg landing-btn-primary"
                    onClick={() => navigate('/login')}
                  >
                    Sign in to Portal
                  </button>
                  <button
                    className="landing-btn landing-btn-lg landing-btn-outline-white"
                    onClick={() => navigate('/login?tab=register')}
                  >
                    Get Patient Account Help
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Slideshow Navigation Controls */}
        <div className="landing-hero-controls">
          <div className="landing-hero-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`landing-hero-dot ${i === slideIndex ? 'active' : ''}`}
                onClick={() => setSlideIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              >
                <span style={{ animationDuration: '5.5s' }} />
              </button>
            ))}
          </div>
          <div className="landing-hero-arrows">
            <button className="landing-arrow-btn" onClick={prevSlide} aria-label="Previous slide">
              ‹
            </button>
            <button className="landing-arrow-btn" onClick={nextSlide} aria-label="Next slide">
              ›
            </button>
          </div>
        </div>
      </section>

      {/* ── Key Metrics / Trust Bar ─────────────────────────────── */}
      <section className="landing-metrics-strip">
        <div className="landing-container">
          {directoryError ? (
            <div role="alert">
              {directoryError} <button type="button" onClick={() => setDirectoryAttempt(n => n + 1)}>Retry</button>
            </div>
          ) : !directory ? <p role="status">Loading clinic information…</p> : null}
          <div className="landing-metrics-grid">
            <div className="landing-metric-item">
              <div className="landing-metric-num">{directory?.branches.length ?? '—'}</div>
              <div className="landing-metric-label">Clinic Branches</div>
              <div className="landing-metric-sub">Current clinic directory</div>
            </div>
            <div className="landing-metric-divider" />
            <div className="landing-metric-item">
              <div className="landing-metric-num">{directory?.specialties.length ?? '—'}</div>
              <div className="landing-metric-label">Medical Disciplines</div>
              <div className="landing-metric-sub">Registered disciplines</div>
            </div>
            <div className="landing-metric-divider" />
            <div className="landing-metric-item">
              <div className="landing-metric-num">{directory?.doctor_count ?? '—'}</div>
              <div className="landing-metric-label">Doctors in Directory</div>
              <div className="landing-metric-sub">Reception-assisted appointments</div>
            </div>
            <div className="landing-metric-divider" />
            <div className="landing-metric-item">
              <div className="landing-metric-num">{directory?.service_count ?? '—'}</div>
              <div className="landing-metric-label">Catalogue Services</div>
              <div className="landing-metric-sub">Itemized billing & claims</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Non-Technical Summary / Overview Section ───────────── */}
      <section id="about" className="landing-section landing-about-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-eyebrow">ABOUT THE PLATFORM</div>
            <h2 className="landing-section-title">What is MedSync CATMS?</h2>
            <p className="landing-section-subtitle">
              A comprehensive, database-backed clinic management solution designed to eliminate the long queues,
              repetitive paperwork, and billing uncertainty of traditional healthcare channeling.
            </p>
          </div>

          <div className="landing-about-grid">
            <div className="landing-about-card">
              <div className="landing-card-icon">🏥</div>
              <h3>For Patients</h3>
              <p>
                View your appointment and billing history through your patient portal. Clinic reception
                handles registration, appointment bookings, cancellations, rescheduling and walk-in check-in.
              </p>
              <ul className="landing-check-list">
                <li>Reception-assisted appointment bookings & cancellations</li>
                <li>One patient account valid in Colombo, Kandy, and Galle</li>
                <li>Clear itemized bills and transparent insurance claim tracking</li>
              </ul>
            </div>

            <div className="landing-about-card">
              <div className="landing-card-icon">👨‍⚕️</div>
              <h3>For Doctors & Specialists</h3>
              <p>
                Spend more time treating patients and less time navigating bureaucracy. View your daily appointment
                roster, review complete patient medical history, record consultation notes, and assign treatments directly from the catalogue.
              </p>
              <ul className="landing-check-list">
                <li>Dedicated daily patient rosters with zero overbooking</li>
                <li>Clinical notes linked directly to patient visit records</li>
                <li>Automated calculation of consultation remuneration and payouts</li>
              </ul>
            </div>

            <div className="landing-about-card">
              <div className="landing-card-icon">📊</div>
              <h3>For Clinic Operations & Staff</h3>
              <p>
                Front-desk receptionists, cashiers, and branch administrators manage patient intake, room queues,
                treatment catalog pricing, and multi-branch staffing smoothly with robust data integrity and audit logging.
              </p>
              <ul className="landing-check-list">
                <li>Instant walk-in registration and fast check-in</li>
                <li>Integrated insurance claim validation and adjudication</li>
                <li>Automated management reports for revenue and clinic occupancy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Capabilities Section ───────────────────────────── */}
      <section id="features" className="landing-section landing-features-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-eyebrow">SYSTEM SCOPE & CAPABILITIES</div>
            <h2 className="landing-section-title">Engineered for Reliable Healthcare</h2>
            <p className="landing-section-subtitle">
              MedSync connects every stage of outpatient care into an integrated, paperless workflow.
            </p>
          </div>

          <div className="landing-features-grid">
            {FEATURES.map((feat, i) => (
              <div key={i} className="landing-feature-card">
                <div className="landing-feature-icon">{feat.icon}</div>
                <h3 className="landing-feature-title">{feat.title}</h3>
                <p className="landing-feature-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works (Patient Journey) ─────────────────────── */}
      <section id="how-it-works" className="landing-section landing-steps-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-eyebrow">SIMPLE 3-STEP EXPERIENCE</div>
            <h2 className="landing-section-title">How MedSync Works for You</h2>
            <p className="landing-section-subtitle">
              From finding the right specialist to receiving transparent medical receipts in minutes.
            </p>
          </div>

          <div className="landing-steps-grid">
            {STEPS.map((step, i) => (
              <div key={i} className="landing-step-card">
                <div className="landing-step-num">{step.num}</div>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Branches Section ─────────────────────────────────── */}
      <section id="branches" className="landing-section landing-branches-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-eyebrow">OUR CLINIC NETWORK</div>
            <h2 className="landing-section-title">Convenient Care Across Sri Lanka</h2>
            <p className="landing-section-subtitle">
              Find branch details below and contact reception to discuss available appointments and services.
            </p>
          </div>

          {directory && directory.branches.length === 0 && <p>No branches have been added yet.</p>}
          <div className="landing-branches-grid">
            {(directory?.branches ?? []).map(b => (
              <div key={b.branch_id} className="landing-branch-card">
                <div className="landing-branch-header">
                  <div className="landing-branch-tag">Clinic branch</div>
                  <h3 className="landing-branch-name">{b.branch_name}</h3>
                  <div className="landing-branch-location">📍 {b.location}</div>
                </div>
                <div className="landing-branch-body">
                  <p className="landing-branch-highlight">Contact reception for bookings, opening hours and service availability.</p>
                  <div className="landing-branch-details">
                    <div>
                      <strong>Telephone:</strong> {b.contact_details || 'Contact details not yet provided'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Medical Specialties Section ─────────────────────────── */}
      <section id="specialties" className="landing-section landing-specialties-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-eyebrow">COMPREHENSIVE CLINICAL CARE</div>
            <h2 className="landing-section-title">Medical Specialties & Services</h2>
            <p className="landing-section-subtitle">
              Browse the current consultation disciplines in our clinic directory.
            </p>
          </div>

          {directory && directory.specialties.length === 0 && <p>No specialties have been added yet.</p>}
          <div className="landing-specialties-grid">
            {(directory?.specialties ?? []).map(spec => (
              <div key={spec.specialty_id} className="landing-spec-pill">
                <div className="landing-spec-dot" />
                <div>
                  <div className="landing-spec-name">{spec.specialty_name}</div>
                  <div className="landing-spec-desc">{spec.description || 'Contact reception for details'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to Action Banner ───────────────────────────────── */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <div className="landing-cta-box">
            <div className="landing-cta-content">
              <h2>Ready to Experience Smarter Healthcare?</h2>
              <p>
                Sign in to manage your appointments, view clinical records, or access the clinic administrative portal.
              </p>
              <div className="landing-cta-buttons">
                {isAuthenticated ? (
                  <button
                    className="landing-btn landing-btn-lg landing-btn-light"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard →
                  </button>
                ) : (
                  <>
                    <button
                      className="landing-btn landing-btn-lg landing-btn-light"
                      onClick={() => navigate('/login')}
                    >
                      Sign in to Your Account
                    </button>
                    <button
                      className="landing-btn landing-btn-lg landing-btn-outline-light"
                      onClick={() => navigate('/login?tab=register')}
                    >
                      Patient Registration Help
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Public Footer ───────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand-col">
              <div className="landing-brand">
                <div className="landing-brand-mark" aria-hidden />
                <div>
                  <div className="landing-brand-name">MedSync</div>
                  <div className="landing-brand-sub">Clinic Appointment & Treatment Management System</div>
                </div>
              </div>
              <p className="landing-footer-desc">
                A reliable, database-centered clinical management system developed for CS3043 (Database Systems)
                at the Department of Computer Science & Engineering, University of Moratuwa.
              </p>
            </div>

            <div className="landing-footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#about">About MedSync</a></li>
                <li><a href="#features">System Capabilities</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#branches">Clinic Branches</a></li>
                <li><a href="#specialties">Specialties</a></li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Access Portal</h4>
              <ul>
                <li><span className="cursor-pointer text-primary" onClick={() => navigate('/login')}>Patient & Staff Sign In</span></li>
                <li><span className="cursor-pointer text-primary" onClick={() => navigate('/login?tab=register')}>Patient Account Help</span></li>
                {isAuthenticated && <li><span className="cursor-pointer text-primary" onClick={() => navigate('/dashboard')}>Clinical Dashboard</span></li>}
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Academic Context</h4>
              <ul>
                <li>Department of Computer Science & Engineering</li>
                <li>University of Moratuwa, Sri Lanka</li>
                <li>Module: CS3043 - Database Systems</li>
                <li>Team: DataNexus</li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <div>© {new Date().getFullYear()} MedSync / CATMS · DataNexus. All rights reserved.</div>
            <div>University of Moratuwa · CS3043 Database Systems Project</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
