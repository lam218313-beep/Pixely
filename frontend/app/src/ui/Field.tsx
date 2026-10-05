import React, { useId } from 'react';

const control = 'w-full rounded-[16px] border border-line bg-ink px-[18px] text-white placeholder:text-text-3 outline-none focus:border-pink-text transition';

export const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | null }> = ({ label, hint, error, className = '', ...rest }) => {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-bold text-text-2">{label}</label>
      <input id={id} className={`${control} h-14`} aria-invalid={!!error} {...rest} />
      {error ? <p role="alert" className="text-[13px] font-semibold text-pink-text">{error}</p> : hint && <p className="text-xs text-text-3">{hint}</p>}
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className = '', ...rest }) => {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-bold text-text-2">{label}</label>
      <textarea id={id} rows={4} className={`${control} py-3.5 leading-relaxed resize-none`} {...rest} />
    </div>
  );
};
