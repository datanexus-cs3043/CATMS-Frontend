import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type DialogOptions = {
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  inputLabel?: string;
  validate?: (value: string) => string | null;
};
type DialogResult = boolean | string | null;
type DialogRequest = DialogOptions & {
  kind: 'message' | 'confirm' | 'input';
  message: string;
  initialValue?: string;
  resolve: (result: DialogResult) => void;
};
type DialogContextValue = {
  showMessage: (message: string, options?: DialogOptions) => Promise<void>;
  confirmAction: (message: string, options?: DialogOptions) => Promise<boolean>;
  requestInput: (message: string, initialValue?: string, options?: DialogOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

/** MedSync-styled dialogs, without blocking browser alert/confirm/prompt calls. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef<DialogRequest | null>(null);
  const queue = useRef<DialogRequest[]>([]);

  const finish = useCallback((result: DialogResult) => {
    const previous = active.current;
    if (!previous) return;
    dialog.current?.close();
    active.current = queue.current.shift() ?? null;
    setRequest(active.current);
    previous.resolve(result);
  }, []);

  // Cancel unresolved decisions on navigation/unmount; never execute an abandoned action.
  useEffect(() => () => {
    const pending = [active.current, ...queue.current];
    active.current = null;
    queue.current = [];
    dialog.current?.close();
    setRequest(null);
    pending.forEach(item => item?.resolve(null));
  }, [pathname]);

  useEffect(() => {
    if (!request) return;
    setValue(request.initialValue ?? '');
    setError('');
    dialog.current?.showModal();
  }, [request]);

  const open = useCallback((options: Omit<DialogRequest, 'resolve'>) =>
    new Promise<DialogResult>(resolve => {
      const next = { ...options, resolve };
      if (active.current) queue.current.push(next);
      else {
        active.current = next;
        setRequest(next);
      }
    }), []);

  const showMessage = useCallback(async (message: string, options: DialogOptions = {}) => {
    await open({ ...options, kind: 'message', message });
  }, [open]);
  const confirmAction = useCallback(async (message: string, options: DialogOptions = {}) =>
    await open({ ...options, kind: 'confirm', message }) === true, [open]);
  const requestInput = useCallback(async (message: string, initialValue = '', options: DialogOptions = {}) => {
    const result = await open({ ...options, kind: 'input', message, initialValue });
    return typeof result === 'string' ? result : null;
  }, [open]);

  return (
    <DialogContext.Provider value={{ showMessage, confirmAction, requestInput }}>
      {children}
      {request && (
        <dialog ref={dialog} className="modal app-dialog" aria-labelledby="app-dialog-title"
          aria-describedby="app-dialog-description" onCancel={event => { event.preventDefault(); finish(null); }}>
          <form onSubmit={event => {
            event.preventDefault();
            const validation = request.kind === 'input' ? request.validate?.(value) : null;
            if (validation) { setError(validation); return; }
            finish(request.kind === 'input' ? value : true);
          }}>
            <div className="modal-header">
              <h3 id="app-dialog-title" className="modal-title">
                {request.title ?? (request.kind === 'message' ? 'MedSync' : 'Please confirm')}
              </h3>
              <button type="button" className="modal-close" aria-label="Close dialog" onClick={() => finish(null)} />
            </div>
            <div className="modal-body">
              <p id="app-dialog-description" className="app-dialog-message">{request.message}</p>
              {request.kind === 'input' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="app-dialog-input">{request.inputLabel ?? 'Value'}</label>
                  <input id="app-dialog-input" className="form-control" autoFocus value={value}
                    aria-invalid={!!error} aria-describedby={error ? 'app-dialog-error' : undefined}
                    onChange={event => { setValue(event.target.value); setError(''); }} />
                  {error && <div id="app-dialog-error" className="alert alert-error" role="alert">{error}</div>}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {request.kind !== 'message' && (
                <button type="button" className="btn btn-ghost" autoFocus={request.kind === 'confirm'}
                  onClick={() => finish(null)}>Go back</button>
              )}
              <button type="submit" className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`}
                autoFocus={request.kind === 'message'}>
                {request.confirmLabel ?? (request.kind === 'message' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
}
