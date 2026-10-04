import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorService, appointmentService, apiErrorMessage, Doctor, Appointment } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { statusBadge } from './Appointments';

export default function DoctorDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPatient } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        setDoctor(await doctorService.getById(Number(id)));
        // Patients see the public profile plus only their own visits with this doctor.
        setAppointments(await appointmentService.getAll({ doctor_id: Number(id) }));
      } catch (err) {
        setError(apiErrorMessage(err, 'Doctor not found.'));
      } finally { setIsLoading(false); }
    };
    load();
  }, [id]);

  if (isLoading) return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-50 rounded-lg" />
      <div className="skeleton h-75 rounded-lg" />
    </div>
  );

  if (!doctor) return (
    <div className="empty-state">
      <p className="empty-state-title">Doctor not found</p>
      <p className="empty-state-desc">{error}</p>
      <button className="btn btn-secondary" onClick={() => navigate('/doctors')}>Back to Doctors</button>
    </div>
  );

  const specialtyColors = ['#1d6fb8', '#3f89cc', '#155a96', '#b86e0c', '#0f4575'];

  return (
    <div className="animate-[fade-in_0.3s_ease]">
      <button className="btn btn-ghost btn-sm mb-5" onClick={() => navigate('/doctors')}>
        Back to Doctors
      </button>

      <div className="card mb-5">
        <div className="card-body p-8">
          <div className="flex gap-6 items-start flex-wrap">
            <div className="avatar avatar-xl">
              {doctor.doctor_name.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-60">
              <div className="flex justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-3xl text-gray-900 m-0">{doctor.doctor_name}</h2>
                  <div className="text-sm text-gray-400 mt-1.5 font-mono">License: {doctor.doctor_license_number}</div>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    {(doctor.specialties || []).map((spec, idx) => (
                      <span className="py-1 px-3 rounded-full text-xs font-semibold bg-(--tint)/10 text-(--tint)" key={spec.specialty_id} style={{ '--tint': specialtyColors[idx % specialtyColors.length] } as React.CSSProperties}>
                        {spec.specialty_name}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(isPatient ? `/my-appointments?doctor_id=${doctor.doctor_id}` : `/appointments?doctor_id=${doctor.doctor_id}`)}
                >
                  Book Appointment
                </button>
              </div>

              {doctor.bio && <p className="mt-4 text-base text-gray-600 leading-[1.6]">{doctor.bio}</p>}

              <div className="divider" />
              <div className="info-grid">
                <div className="info-item"><span className="info-label">Branch</span><span className="info-value">{doctor.branch_name}</span></div>
                {doctor.email && <div className="info-item"><span className="info-label">Email</span><span className="info-value">{doctor.email}</span></div>}
                {doctor.contact_details && <div className="info-item"><span className="info-label">Contact</span><span className="info-value">{doctor.contact_details}</span></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{isPatient ? 'My Visits With This Doctor' : 'Appointment History'}</h3>
          <span className="badge badge-primary">{appointments.length} total</span>
        </div>
        {appointments.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No appointments</p>
            <p className="empty-state-desc">{isPatient ? 'You have not visited this doctor yet.' : 'No appointment history for this doctor.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Time</th>{!isPatient && <th>Patient</th>}<th>Type</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {appointments.map(a => (
                  <tr className="cursor-pointer" key={a.appointment_id} onClick={() => navigate(`/appointments/${a.appointment_id}`)}>
                    <td>{a.appointment_date}</td>
                    <td className="text-gray-500">{a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}</td>
                    {!isPatient && <td>{a.patient_name}</td>}
                    <td><span className="badge badge-info">{a.appointment_type}</span></td>
                    <td>{statusBadge(a.status)}</td>
                    <td><button className="btn btn-secondary btn-sm">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
