import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  appointmentService, invoiceService, treatmentService, apiErrorMessage,
  Appointment, AppointmentTreatment, ConsultationNote, Invoice, Treatment,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { localDate } from '../services/mockData';
import { statusBadge } from './Appointments';

export default function AppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager, isCashier, isDoctor, isPatient, user } = useAuth();
  const isStaff = isAdmin || isManager || isCashier;

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [recorded, setRecorded] = useState<AppointmentTreatment[]>([]);
  const [catalogue, setCatalogue] = useState<Treatment[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [txForm, setTxForm] = useState({ treatment_id: '', quantity: 1 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({ appointment_date: '', start_time: '', end_time: '' });

  const apptId = Number(id);

  const load = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const a = await appointmentService.getById(apptId);
      setAppt(a);
      const [n, t, cat, invs] = await Promise.allSettled([
        appointmentService.getNotes(apptId),
        appointmentService.getTreatments(apptId),
        treatmentService.getAll(),
        isDoctor ? Promise.resolve([]) : invoiceService.getAll({ appointment_id: apptId }),
      ]);
      if (n.status === 'fulfilled') setNotes(n.value);
      if (t.status === 'fulfilled') setRecorded(t.value);
      if (cat.status === 'fulfilled') setCatalogue(cat.value);
      setInvoice(invs.status === 'fulfilled' ? invs.value[0] ?? null : null);
    } catch (err) {
      setAppt(null);
      setLoadError(apiErrorMessage(err, 'Appointment not found.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 4000);
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      flash('success', success);
      await load();
    } catch (err) {
      flash('error', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (isDoctor || isPatient) navigate('/my-appointments');
    else navigate('/appointments');
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const note = await appointmentService.addNote(apptId, { note_content: noteText });
      setNotes([...notes, note]);
      setNoteText('');
    } catch (err) {
      flash('error', apiErrorMessage(err));
    } finally { setAddingNote(false); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleError('');
    try {
      const created = await appointmentService.reschedule(apptId, rescheduleForm);
      setShowReschedule(false);
      navigate(`/appointments/${created.appointment_id}`);
    } catch (err) {
      setRescheduleError(apiErrorMessage(err, 'Reschedule failed.'));
    }
  };

  if (isLoading) return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-55 rounded-lg" />
      <div className="skeleton h-62.5 rounded-lg" />
    </div>
  );

  if (!appt) return (
    <div className="empty-state">
      <p className="empty-state-title">{loadError.includes('only access') ? 'Access denied' : 'Appointment not found'}</p>
      <p className="empty-state-desc">{loadError}</p>
      <button className="btn btn-secondary" onClick={goBack}>Back</button>
    </div>
  );

  const today = localDate(0);
  const isScheduled = appt.status === 'Scheduled';
  const isCompleted = appt.status === 'Completed';
  const isTreatingDoctor = isDoctor && appt.doctor_id === user?.doctor_id;
  const canManage = isStaff || (isPatient && appt.patient_id === user?.patient_id);
  const canComplete = isScheduled && appt.appointment_date <= today && (isStaff || isTreatingDoctor);
  const canRecordTreatments = isCompleted && !invoice && (isAdmin || isTreatingDoctor);
  const canAddNotes = appt.status !== 'Cancelled' && (isTreatingDoctor || isAdmin);
  const treatmentsTotal = recorded.reduce((s, t) => s + Number(t.unit_price || 0) * t.quantity, 0);

  return (
    <div className="animate-[fade-in_0.3s_ease]">
      <div className="flex items-center gap-3 mb-5">
        <button className="btn btn-ghost btn-sm" onClick={goBack}>
          Back
        </button>
        {appt.appointment_date === today && <span className="badge badge-success">Today</span>}
      </div>

      {message && <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>{message.text}</div>}

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex flex-col gap-5 flex-[2_1_520px] min-w-0">
          <div className="card">
            <div className="card-header flex-wrap gap-2">
              <h3 className="card-title">Appointment #{appt.appointment_id}</h3>
              <div className="flex gap-2 flex-wrap">
                {statusBadge(appt.status)}
                <span className="badge badge-info">{appt.appointment_type}</span>
                {canComplete && (
                  <button className="btn btn-primary btn-sm" disabled={busy}
                    onClick={() => confirm('Mark this appointment as completed?') && run(() => appointmentService.complete(apptId), 'Appointment marked as completed. Record the treatments given below.')}>
                    Mark Completed
                  </button>
                )}
                {isScheduled && canManage && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setRescheduleForm({ appointment_date: appt.appointment_date, start_time: appt.start_time.slice(0, 5), end_time: appt.end_time.slice(0, 5) }); setRescheduleError(''); setShowReschedule(true); }}>Reschedule</button>
                    <button className="btn btn-danger btn-sm" disabled={busy}
                      onClick={() => confirm('Are you sure you want to cancel this appointment?') && run(() => appointmentService.cancel(apptId), 'Appointment cancelled.')}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Patient</span>
                  {isPatient ? (
                    <span className="info-value">{appt.patient_name}</span>
                  ) : (
                    <span className="info-value cursor-pointer text-primary" onClick={() => navigate(`/patients/${appt.patient_id}`)}>
                      {appt.patient_name}
                    </span>
                  )}
                </div>
                <div className="info-item">
                  <span className="info-label">Doctor</span>
                  {isDoctor ? (
                    <span className="info-value">{appt.doctor_name}</span>
                  ) : (
                    <span className="info-value cursor-pointer text-primary" onClick={() => navigate(`/doctors/${appt.doctor_id}`)}>
                      {appt.doctor_name}
                    </span>
                  )}
                </div>
                <div className="info-item"><span className="info-label">Date</span><span className="info-value">{appt.appointment_date}</span></div>
                <div className="info-item"><span className="info-label">Time</span><span className="info-value">{appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}</span></div>
                <div className="info-item"><span className="info-label">Branch</span><span className="info-value">{appt.branch_name}</span></div>
                <div className="info-item"><span className="info-label">Booked By</span><span className="info-value">{appt.created_by}</span></div>
                {appt.treatment_name && (
                  <div className="info-item"><span className="info-label">Booked Service</span><span className="info-value">{appt.treatment_name}</span></div>
                )}
                {appt.original_appointment_id && (
                  <div className="info-item">
                    <span className="info-label">Rescheduled From</span>
                    <span className="info-value cursor-pointer text-primary" onClick={() => navigate(`/appointments/${appt.original_appointment_id}`)}>
                      Appt #{appt.original_appointment_id}
                    </span>
                  </div>
                )}
                {appt.rescheduled_to && (
                  <div className="info-item">
                    <span className="info-label">Rescheduled To</span>
                    <span className="info-value cursor-pointer text-primary" onClick={() => navigate(`/appointments/${appt.rescheduled_to}`)}>
                      Appt #{appt.rescheduled_to}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Treatments recorded */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Treatments Given</h3>
              <span className="badge badge-gray">{recorded.length}</span>
            </div>
            <div className="card-body">
              {!isCompleted && (
                <p className="text-gray-400 text-sm mb-3">
                  {appt.status === 'Cancelled' ? 'This appointment was cancelled.' : 'Treatments are recorded once the appointment is marked as completed.'}
                </p>
              )}
              {recorded.length > 0 && (
                <div className="table-container mb-4">
                  <table>
                    <thead><tr><th>Code</th><th>Treatment</th><th>Qty</th><th>Unit Price</th><th>Line Total</th>{canRecordTreatments && <th></th>}</tr></thead>
                    <tbody>
                      {recorded.map(t => (
                        <tr key={t.appointment_treatment_id}>
                          <td className="font-mono text-xs">{t.service_code}</td>
                          <td className="font-medium">{t.treatment_name}</td>
                          <td>{t.quantity}</td>
                          <td>Rs. {Number(t.unit_price).toLocaleString()}</td>
                          <td className="font-semibold">Rs. {(Number(t.unit_price) * t.quantity).toLocaleString()}</td>
                          {canRecordTreatments && (
                            <td>
                              <button className="btn btn-ghost btn-sm" disabled={busy}
                                onClick={() => run(() => appointmentService.removeTreatment(apptId, t.appointment_treatment_id), 'Treatment removed.')}>
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-right py-2.5 px-3.5 font-bold">Total: Rs. {treatmentsTotal.toLocaleString()}</div>
                </div>
              )}
              {canRecordTreatments && (
                <form className="flex gap-2 flex-wrap items-end"
                  onSubmit={e => {
                    e.preventDefault();
                    if (!txForm.treatment_id) return;
                    run(() => appointmentService.addTreatment(apptId, { treatment_id: Number(txForm.treatment_id), quantity: txForm.quantity }), 'Treatment recorded.')
                      .then(() => setTxForm({ treatment_id: '', quantity: 1 }));
                  }}
                >
                  <div className="form-group flex-1 min-w-55 mb-0">
                    <label className="form-label">Add treatment from catalogue</label>
                    <select className="form-control" required value={txForm.treatment_id} onChange={e => setTxForm({ ...txForm, treatment_id: e.target.value })}>
                      <option value="">Select treatment...</option>
                      {catalogue.map(t => <option key={t.treatment_id} value={t.treatment_id}>{t.service_code} · {t.treatment_name} (Rs. {Number(t.standard_price).toLocaleString()})</option>)}
                    </select>
                  </div>
                  <div className="form-group w-22.5 mb-0">
                    <label className="form-label">Qty</label>
                    <input type="number" min={1} className="form-control" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={busy || !txForm.treatment_id}>Add</button>
                </form>
              )}
              {isCompleted && invoice && (
                <p className="text-xs text-gray-400">Treatments are locked because the invoice has been generated.</p>
              )}
            </div>
          </div>

          {/* Consultation Notes */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Consultation Notes</h3>
              <span className="badge badge-gray">{notes.length}</span>
            </div>
            <div className="card-body">
              {notes.length === 0 ? (
                <p className="text-gray-400 text-base mb-4">No notes recorded yet.</p>
              ) : (
                <div className="flex flex-col gap-3 mb-4">
                  {notes.map(note => (
                    <div className="bg-primary-50 border-l-3 border-l-primary rounded-r-md py-3 px-4" key={note.note_id}>
                      <p className="text-base text-gray-700 m-0">{note.note_content}</p>
                      <p className="text-2xs text-gray-400 mt-1.5">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              {canAddNotes && (
                <div className="flex gap-2">
                  <textarea className="form-control flex-1" placeholder="Add a consultation note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} />
                  <button className="btn btn-primary self-end" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
                    {addingNote ? <span className="spinner border-2 size-3.5" /> : 'Add'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing sidebar (hidden from doctors) */}
        {!isDoctor && (
          <div className="card flex-[1_1_300px] min-w-0">
            <div className="card-header">
              <h3 className="card-title">Billing</h3>
            </div>
            <div className="card-body">
              {invoice ? (
                <div>
                  {[
                    ['Invoice #', `INV-${invoice.invoice_id}`],
                    ['Date', invoice.invoice_date],
                    ['Total', `Rs. ${Number(invoice.total_amount ?? 0).toLocaleString()}`],
                    ['Insurance Covered', `Rs. ${Number(invoice.insurance_covered ?? 0).toLocaleString()}`],
                    ['Amount Paid', `Rs. ${Number(invoice.amount_paid).toLocaleString()}`],
                  ].map(([label, value]) => (
                    <div className="flex justify-between mb-2.5" key={label}>
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between mb-4">
                    <span className="text-sm text-gray-500">Balance</span>
                    <span className={`font-bold ${invoice.balance > 0 ? 'text-danger' : 'text-success'}`}>Rs. {Number(invoice.balance).toLocaleString()}</span>
                  </div>
                  <span className={`badge ${invoice.status === 'Paid' ? 'badge-success' : invoice.status === 'Partially Paid' ? 'badge-warning' : 'badge-danger'}`}>{invoice.status}</span>
                  <button className="btn btn-secondary w-full mt-4" onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}>
                    View Full Invoice
                  </button>
                </div>
              ) : (
                <div className="text-center py-5 px-0">
                  <p className="text-gray-400 text-sm mb-3">
                    {isCompleted ? 'No invoice generated yet.' : 'An invoice is generated after the appointment is completed.'}
                  </p>
                  {isStaff && isCompleted && (
                    <button className="btn btn-primary" disabled={busy}
                      onClick={() => run(() => invoiceService.generate(apptId), 'Invoice generated from the recorded treatments.')}>
                      Generate Invoice
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showReschedule && (
        <div className="modal-overlay" onClick={() => setShowReschedule(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reschedule Appointment</h3>
              <button className="modal-close" onClick={() => setShowReschedule(false)}></button>
            </div>
            <form onSubmit={handleReschedule}>
              <div className="modal-body">
                <div className="alert alert-info">A new appointment with the same doctor is created and linked to this one; this appointment is then cancelled.</div>
                {rescheduleError && <div className="alert alert-error">{rescheduleError}</div>}
                <div className="form-group">
                  <label className="form-label">New Date *</label>
                  <input type="date" className="form-control" required min={today} value={rescheduleForm.appointment_date} onChange={e => setRescheduleForm({ ...rescheduleForm, appointment_date: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input type="time" className="form-control" required value={rescheduleForm.start_time} onChange={e => setRescheduleForm({ ...rescheduleForm, start_time: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input type="time" className="form-control" required value={rescheduleForm.end_time} onChange={e => setRescheduleForm({ ...rescheduleForm, end_time: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReschedule(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
