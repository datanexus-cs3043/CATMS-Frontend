import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  appointmentService, invoiceService, treatmentService, apiErrorMessage,
  Appointment, AppointmentTreatment, ConsultationNote, Invoice, Treatment,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { localDate } from '../utils/date';
import { statusBadge } from './Appointments';
import { useDialog } from '../components/DialogProvider';
import { appointmentActionError } from '../utils/appointmentActionError';

export default function AppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager, isCashier, isDoctor, isPatient, user } = useAuth();
  const { confirmAction } = useDialog();
  const isStaff = isAdmin || isManager || isCashier;
  const canBill = isAdmin || isCashier || isManager;
  // Consultation notes are clinical records: the backend serves them only to admin, manager and doctors.
  const canViewNotes = isAdmin || isManager || isDoctor;

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loadError, setLoadError] = useState('');
  const [relatedError, setRelatedError] = useState('');
  const loadVersion = useRef(0);
  const actionPending = useRef(false);
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
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError('');
    setRelatedError('');
    setNotes([]);
    setRecorded([]);
    setCatalogue([]);
    setInvoice(null);
    try {
      const a = await appointmentService.getById(apptId);
      if (version !== loadVersion.current) return;
      setAppt(a);
      const [n, t, cat, invs] = await Promise.allSettled([
        canViewNotes ? appointmentService.getNotes(apptId) : Promise.resolve([]),
        appointmentService.getTreatments(apptId),
        isAdmin || isDoctor ? treatmentService.getAll() : Promise.resolve([]),
        isDoctor ? Promise.resolve([]) : invoiceService.getAll({ appointment_id: apptId }),
      ]);
      if (version !== loadVersion.current) return;
      if (n.status === 'fulfilled') setNotes(n.value);
      if (t.status === 'fulfilled') setRecorded(t.value);
      if (cat.status === 'fulfilled') setCatalogue(cat.value);
      setInvoice(invs.status === 'fulfilled' ? invs.value[0] ?? null : null);
      const failed = [n, t, cat, invs].find(r => r.status === 'rejected');
      setRelatedError(failed?.status === 'rejected' ? apiErrorMessage(failed.reason, 'Some visit details could not be loaded. Reload before making changes.') : '');
    } catch (err) {
      if (version !== loadVersion.current) return;
      setAppt(null);
      setLoadError(apiErrorMessage(err, 'Appointment not found.'));
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    setNoteText('');
    setTxForm({ treatment_id: '', quantity: 1 });
    setShowReschedule(false);
    setMessage(null);
    if (id) void load();
    return () => { loadVersion.current++; };
  }, [id]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 4000);
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (actionPending.current) return false;
    actionPending.current = true;
    setBusy(true);
    try {
      await action();
      flash('success', success);
      await load();
      return true;
    } catch (err) {
      flash('error', appointmentActionError(err));
      return false;
    } finally {
      setBusy(false);
      actionPending.current = false;
    }
  };

  const goBack = () => {
    if (isDoctor || isPatient) navigate('/my-appointments');
    else navigate('/appointments');
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || actionPending.current) return;
    setAddingNote(true);
    try {
      if (await run(() => appointmentService.addNote(apptId, { note_content: noteText }), 'Consultation note recorded.')) {
        setNoteText('');
      }
    } finally { setAddingNote(false); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionPending.current) return;
    if (!rescheduleForm.appointment_date || !rescheduleForm.start_time || rescheduleForm.end_time <= rescheduleForm.start_time) {
      setRescheduleError('Choose a date and an end time after the start time.');
      return;
    }
    actionPending.current = true;
    setBusy(true);
    setRescheduleError('');
    try {
      const created = await appointmentService.reschedule(apptId, rescheduleForm);
      setShowReschedule(false);
      navigate(`/appointments/${created.appointment_id}`);
    } catch (err) {
      setRescheduleError(apiErrorMessage(err, 'Reschedule failed.'));
    } finally { actionPending.current = false; setBusy(false); }
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
  const unbilled = !appt.invoice_id && !invoice;
  const canManage = isStaff && unbilled && !relatedError;
  const hasCompletionEvidence = recorded.length > 0 || notes.length > 0 || !!appt.treatment_id;
  const canComplete = isScheduled && unbilled && !relatedError && appt.appointment_date <= today && (isStaff || isTreatingDoctor);
  // Treatments are recorded during the visit (before or after completion) until it is billed;
  // the database only lets a visit be completed once a treatment or note exists.
  const canRecordTreatments = appt.status !== 'Cancelled' && unbilled && !relatedError && (isAdmin || isTreatingDoctor);
  const canAddNotes = appt.status !== 'Cancelled' && unbilled && !relatedError && (isTreatingDoctor || isAdmin);
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
      {relatedError && <div className="alert alert-error" role="alert">{relatedError}<button className="btn btn-ghost btn-sm" onClick={() => void load()}>Reload visit</button></div>}
      {isPatient && <div className="alert alert-info">Please contact clinic staff to book, cancel or reschedule a visit.</div>}

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex flex-col gap-5 flex-[2_1_520px] min-w-0">
          <div className="card">
            <div className="card-header flex-wrap gap-2">
              <h3 className="card-title">Appointment #{appt.appointment_id}</h3>
              <div className="flex gap-2 flex-wrap">
                {statusBadge(appt.status)}
                <span className="badge badge-info">{appt.appointment_type}</span>
                {canComplete && (
                  <button className="btn btn-primary btn-sm" disabled={busy || (canViewNotes && !hasCompletionEvidence)}
                    onClick={async () => {
                      if (await confirmAction('Mark this appointment as completed?', { title: 'Complete appointment', confirmLabel: 'Mark completed' })) {
                        await run(() => appointmentService.complete(apptId), 'Appointment marked as completed.');
                      }
                    }}>
                    Mark Completed
                  </button>
                )}
                {isScheduled && canManage && (
                  <>
                    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => { setRescheduleForm({ appointment_date: appt.appointment_date, start_time: appt.start_time.slice(0, 5), end_time: appt.end_time.slice(0, 5) }); setRescheduleError(''); setShowReschedule(true); }}>Reschedule</button>
                    <button className="btn btn-danger btn-sm" disabled={busy}
                      onClick={async () => {
                        if (await confirmAction('Are you sure you want to cancel this appointment?', { title: 'Cancel appointment', confirmLabel: 'Cancel appointment', danger: true })) {
                          await run(() => appointmentService.cancel(apptId), 'Appointment cancelled.');
                        }
                      }}>
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
                <div className="info-item"><span className="info-label">Booked By</span><span className="info-value">{appt.created_by_name || appt.created_by}</span></div>
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
              {appt.status === 'Cancelled' ? (
                <p className="text-gray-400 text-sm mb-3">This appointment was cancelled.</p>
              ) : (
                <p className="text-gray-400 text-sm mb-3">
                  {!unbilled
                    ? 'Treatments and consultation notes are locked because the invoice has been generated.'
                    : isCompleted
                    ? 'Treatments and consultation notes can still be recorded until the invoice is generated.'
                    : 'Record at least one treatment or consultation note before completing the visit. You can continue recording after completion until invoicing.'}
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
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!txForm.treatment_id || !Number.isInteger(txForm.quantity) || txForm.quantity < 1 || txForm.quantity > 2147483647) return;
                    if (await run(() => appointmentService.addTreatment(apptId, { treatment_id: Number(txForm.treatment_id), quantity: txForm.quantity }), 'Treatment recorded.')) {
                      setTxForm({ treatment_id: '', quantity: 1 });
                    }
                  }}
                >
                  <div className="form-group flex-1 min-w-55 mb-0">
                    <label className="form-label">Add treatment from catalogue</label>
                    <select className="form-control" required value={txForm.treatment_id} onChange={e => setTxForm({ ...txForm, treatment_id: e.target.value })}>
                      <option value="">Select treatment...</option>
                      {catalogue.filter(t => !recorded.some(r => r.treatment_id === t.treatment_id)).map(t => <option key={t.treatment_id} value={t.treatment_id}>{t.service_code} · {t.treatment_name} (Rs. {Number(t.standard_price).toLocaleString()})</option>)}
                    </select>
                  </div>
                  <div className="form-group w-22.5 mb-0">
                    <label className="form-label">Qty</label>
                    <input type="number" required min={1} max={2147483647} step={1} className="form-control" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: Number(e.target.value) })} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={busy || !txForm.treatment_id}>Add</button>
                </form>
              )}
              {!unbilled && (
                <p className="text-xs text-gray-400">Treatments are locked because the invoice has been generated.</p>
              )}
            </div>
          </div>

          {/* Consultation Notes */}
          {canViewNotes && <div className="card">
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
                  <button className="btn btn-primary self-end" onClick={handleAddNote} disabled={busy || addingNote || !noteText.trim()}>
                    {addingNote ? <span className="spinner border-2 size-3.5" /> : 'Add'}
                  </button>
                </div>
              )}
            </div>
          </div>}
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
                  {/* The backend only lets staff of the appointment's branch issue its invoice. */}
                  {canBill && isCompleted && unbilled && !relatedError && (appt.branch_id === user?.branch_id ? (
                    <button className="btn btn-primary" disabled={busy}
                      onClick={() => run(() => invoiceService.generate(apptId), 'Invoice generated from the recorded treatments.')}>
                      Generate Invoice
                    </button>
                  ) : (
                    <p className="text-gray-400 text-sm">Invoices are issued by staff of {appt.branch_name || "the appointment's branch"}.</p>
                  ))}
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
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Rescheduling…' : 'Reschedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
