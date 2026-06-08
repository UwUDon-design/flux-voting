import toast from 'react-hot-toast';

export function confirm(message) {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#F0EBE0' }}>{message}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              style={{ padding: '4px 12px', background: '#E05C00', color: '#F0EBE0', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}
            >
              Confirm
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
              style={{ padding: '4px 12px', background: '#1E1E1E', color: '#7A7060', border: '1px solid #7A7060', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, style: { background: '#2E2E2E', border: '1px solid #7A7060' } }
    );
  });
}
