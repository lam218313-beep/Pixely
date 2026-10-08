import React from 'react';
import { Link } from 'react-router';
import { ThinkingOrb } from './ThinkingOrb';

type Variant = 'primary' | 'secondary' | 'ghost';

const base = 'inline-flex items-center justify-center gap-2 rounded-[16px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-pink-fill text-white shadow-[0_12px_28px_rgba(217,11,102,0.35)]',
  secondary: 'border border-line bg-transparent text-white',
  ghost: 'bg-transparent text-text-2',
};
const sizes = { md: 'h-14 px-5 text-[15px]', sm: 'h-11 px-4 text-sm' };

interface Common {
  variant?: Variant;
  size?: keyof typeof sizes;
  icon?: React.ReactNode;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Real <button>, or a router link when `to` is given. Primary = the one thing to do on the screen. */
export const Button: React.FC<Common & ({ to: string } | (React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; to?: undefined }))> = (props) => {
  const { variant = 'primary', size = 'md', icon, block, className = '', children } = props;
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`;
  if ('to' in props && props.to) {
    return <Link to={props.to} className={cls}>{icon}{children}</Link>;
  }
  const { loading, variant: _v, size: _s, icon: _i, block: _b, className: _c, to: _t, ...rest } = props as React.ButtonHTMLAttributes<HTMLButtonElement> & Common & { loading?: boolean; to?: undefined };
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading} className={cls}>
      {loading ? <ThinkingOrb size={20} /> : icon}
      {children}
    </button>
  );
};

/** Square icon-only button (back, close, bell). Always needs a label for screen readers. */
export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; to?: string }> = ({ label, to, className = '', children, ...rest }) => {
  const cls = `w-11 h-11 shrink-0 rounded-[14px] border border-line flex items-center justify-center text-white active:scale-95 transition ${className}`;
  if (to) return <Link to={to} aria-label={label} className={cls}>{children}</Link>;
  return <button type="button" aria-label={label} className={cls} {...rest}>{children}</button>;
};
