/**
 * Public pages the app stores require: the privacy policy and how to delete an account.
 * Both open without signing in (Google Play asks for a web link to each).
 *
 * BORRADOR: complete the company's legal details below and have the text reviewed before publishing.
 */
import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, MessageCircle, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Dot, IconButton } from '@/ui';

export const LEGAL = {
  razonSocial: '[Razón social de Pixely]',
  ruc: '[RUC]',
  correo: '[correo de contacto]',
  whatsapp: '51949268607',
  actualizado: '5 de octubre de 2026',
};

const Page: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-[480px] min-h-full px-6 pt-safe pb-safe">
      <div className="pt-4"><IconButton label="Volver" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}><ArrowLeft size={20} strokeWidth={2.5} /></IconButton></div>
      <h1 className="mt-6 mb-2 font-display font-bold text-[30px] leading-tight">{title}<Dot /></h1>
      <p className="m-0 mb-6 text-xs text-text-3">Actualizado el {LEGAL.actualizado}</p>
      <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-text-soft [&_h2]:m-0 [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-extrabold [&_h2]:text-white [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5 [&_li]:mb-1">
        {children}
      </div>
    </div>
  );
};

export const PrivacidadScreen: React.FC = () => (
  <Page title="Privacidad">
    <section>
      <p>Pixely es la app de los clientes de {LEGAL.razonSocial} (RUC {LEGAL.ruc}), agencia de marketing en Lima. Aquí explicamos qué datos usamos, para qué y cómo puedes pedir que los borremos, según la Ley N.° 29733 de Protección de Datos Personales del Perú.</p>
    </section>
    <section>
      <h2>Quién puede usar la app</h2>
      <p>Solo las personas que el equipo de Pixely da de alta como clientes. No hay registro abierto.</p>
    </section>
    <section>
      <h2>Qué datos usamos</h2>
      <ul>
        <li><strong>Tu cuenta:</strong> tu correo y tu nombre, para que puedas entrar.</li>
        <li><strong>La información de tu negocio</strong> que nos diste en la ficha, tu estrategia, tu voz de marca y tu estudio de mercado.</li>
        <li><strong>Tu contenido:</strong> las ideas, piezas y textos que preparamos para tu marca, y lo que decides sobre ellos (aprobaciones y comentarios).</li>
        <li><strong>Resultados de tus publicaciones</strong> (alcance, interacciones y similares), que traemos de Metricool.</li>
      </ul>
    </section>
    <section>
      <h2>Lo que no hacemos</h2>
      <ul>
        <li>No vendemos ni alquilamos tus datos.</li>
        <li>No mostramos publicidad ni usamos herramientas de rastreo publicitario.</li>
        <li>Face ID o tu huella nunca salen de tu teléfono: el teléfono solo nos dice si fuiste tú.</li>
      </ul>
    </section>
    <section>
      <h2>Dónde se guardan</h2>
      <p>En los servidores de nuestros proveedores: Supabase (base de datos y archivos), Railway (servidor de la app) y Metricool (programación y resultados de tus publicaciones). En tu teléfono, la sesión se guarda en su almacenamiento seguro. Toda la comunicación viaja cifrada (HTTPS).</p>
    </section>
    <section>
      <h2>Cuánto tiempo</h2>
      <p>Mientras seas cliente. Si dejas de serlo o pides eliminar tu cuenta, la borramos junto con tus datos personales, salvo lo que la ley nos obligue a conservar (por ejemplo, comprobantes de pago).</p>
    </section>
    <section>
      <h2>Tus derechos</h2>
      <p>Puedes pedir acceder a tus datos, corregirlos, cancelarlos u oponerte a su uso. Escríbenos a {LEGAL.correo} o por WhatsApp al +{LEGAL.whatsapp} y te respondemos en un máximo de 10 días hábiles.</p>
    </section>
  </Page>
);

export const EliminarCuentaScreen: React.FC = () => {
  const { session } = useAuth();
  const text = encodeURIComponent(`Hola, quiero eliminar mi cuenta de Pixely${session?.email ? ` (${session.email})` : ''}.`);
  return (
    <Page title="Eliminar tu cuenta">
      <section>
        <p>Puedes pedir que eliminemos tu cuenta de Pixely y tus datos personales cuando quieras. Escríbenos desde el correo de tu cuenta o por WhatsApp; lo hacemos en un máximo de 10 días hábiles y te confirmamos cuando esté listo.</p>
      </section>
      <div className="flex flex-col gap-2.5">
        <Button block icon={<MessageCircle size={18} />} onClick={() => window.open(`https://wa.me/${LEGAL.whatsapp}?text=${text}`, '_blank')}>Pedirlo por WhatsApp</Button>
        {LEGAL.correo.includes('@') && (
          <Button block variant="secondary" icon={<Mail size={18} />} onClick={() => window.open(`mailto:${LEGAL.correo}?subject=${encodeURIComponent('Eliminar mi cuenta de Pixely')}&body=${text}`, '_blank')}>Pedirlo por correo</Button>
        )}
      </div>
      <section>
        <h2>Qué se elimina</h2>
        <ul>
          <li>Tu acceso a la app y tu cuenta.</li>
          <li>Tus datos personales: correo, nombre y comentarios.</li>
        </ul>
      </section>
      <section>
        <h2>Qué se conserva</h2>
        <ul>
          <li>Las publicaciones que ya salieron en las redes de tu marca: son de tu marca y se manejan desde esas redes.</li>
          <li>Lo que la ley nos obliga a guardar, como los comprobantes de pago.</li>
        </ul>
      </section>
    </Page>
  );
};
