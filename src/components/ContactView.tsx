import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

export const ContactView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: 'Casamento',
    date: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedMsg = `Olá, Rocha Foto & Vídeo!%0A%0AGostaria de solicitar um orçamento:%0A- Nome: ${encodeURIComponent(
      form.name
    )}%0A- E-mail: ${encodeURIComponent(form.email)}%0A- Telefone: ${encodeURIComponent(
      form.phone
    )}%0A- Tipo de Evento: ${encodeURIComponent(form.eventType)}%0A- Data Prevista: ${encodeURIComponent(
      form.date || 'A definir'
    )}%0A- Mensagem: ${encodeURIComponent(form.message)}`;

    const whatsappUrl = `https://wa.me/553891065054?text=${formattedMsg}`;
    window.open(whatsappUrl, '_blank');
    setSubmitted(false);
    alert('Mensagem preparada! Redirecionando para o WhatsApp oficial da Rocha Foto & Vídeo.');
  };

  return (
    <div
      className={`w-full py-16 transition-colors ${
        isLight ? 'bg-[#fcfcfc] text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-[#c99e64] text-xs font-semibold uppercase tracking-[0.25em] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fale Conosco</span>
          </div>
          <h1
            className={`font-serif-luxury text-4xl sm:text-5xl font-normal ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}
          >
            Vamos Planejar o Registro do seu Evento?
          </h1>
          <p
            className={`text-xs sm:text-sm mt-3 leading-relaxed ${
              isLight ? 'text-gray-600' : 'text-[#9ca3af]'
            }`}
          >
            Entre em contato para consultar disponibilidade de datas, pacotes fotográficos e agendamento
            de visita ao nosso estúdio.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
          {/* Institutional Info & Studio Address */}
          <div
            className={`lg:col-span-5 space-y-8 p-8 rounded-2xl border transition-colors ${
              isLight
                ? 'bg-white border-gray-200 shadow-sm'
                : 'bg-[#12151a] border-[#222731]'
            }`}
          >
            <div>
              <h2
                className={`font-serif-luxury text-2xl ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}
              >
                Rocha Foto & Vídeo
              </h2>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isLight ? 'text-gray-600' : 'text-[#9ca3af]'
                }`}
              >
                Atendimento exclusivo com hora marcada para você conferir nossos álbuns encadernados e
                conhecer nossa equipe.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg text-[#c99e64] ${
                    isLight ? 'bg-amber-50' : 'bg-[#1b1f28]'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span
                    className={`block font-medium ${
                      isLight ? 'text-gray-500' : 'text-[#828a95]'
                    }`}
                  >
                    WhatsApp & Telefones
                  </span>
                  <div
                    className={`font-semibold space-y-0.5 ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    <p>+55 (38) 9106-5054 (WhatsApp)</p>
                    <p className="text-[11px] text-gray-500 font-normal">(38) 3084-3444 (Studio Fixo)</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg text-[#c99e64] ${
                    isLight ? 'bg-amber-50' : 'bg-[#1b1f28]'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span
                    className={`block font-medium ${
                      isLight ? 'text-gray-500' : 'text-[#828a95]'
                    }`}
                  >
                    E-mail Oficial
                  </span>
                  <a
                    href="mailto:rochafoto.video@hotmail.com"
                    className={`font-semibold hover:underline ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    rochafoto.video@hotmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg text-[#c99e64] ${
                    isLight ? 'bg-amber-50' : 'bg-[#1b1f28]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span
                    className={`block font-medium ${
                      isLight ? 'text-gray-500' : 'text-[#828a95]'
                    }`}
                  >
                    Endereço do Studio
                  </span>
                  <span
                    className={`font-semibold leading-relaxed block ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    R. Juca Prates, 610 - Centro, Montes Claros - MG, 39400-078
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <div
                  className={`p-2 rounded-lg text-[#c99e64] ${
                    isLight ? 'bg-amber-50' : 'bg-[#1b1f28]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div className="w-full">
                  <span
                    className={`block font-medium mb-1.5 ${
                      isLight ? 'text-gray-500' : 'text-[#828a95]'
                    }`}
                  >
                    Horários de Atendimento
                  </span>
                  <div className={`space-y-1 text-[11px] rounded-lg p-2.5 ${
                    isLight ? 'bg-gray-100 text-gray-700' : 'bg-[#0e1013] text-gray-300'
                  }`}>
                    <div className="flex justify-between py-0.5 border-b border-black/5 dark:border-white/5">
                      <span className="font-medium">Segunda-feira:</span>
                      <span>09:00 - 17:00</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-black/5 dark:border-white/5">
                      <span className="font-medium">Terça-feira:</span>
                      <span>09:00 - 17:00</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-black/5 dark:border-white/5 text-amber-600/90 dark:text-amber-400/80">
                      <span className="font-medium">Quarta-feira:</span>
                      <span>Fechada (Produção externa)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-black/5 dark:border-white/5">
                      <span className="font-medium">Quinta-feira:</span>
                      <span>09:00 - 17:00</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-black/5 dark:border-white/5">
                      <span className="font-medium">Sexta-feira:</span>
                      <span>09:00 - 17:00</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-black/5 dark:border-white/5">
                      <span className="font-medium">Sábado:</span>
                      <span>09:00 - 12:00</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-gray-400 dark:text-gray-500">
                      <span className="font-medium">Domingo:</span>
                      <span>Fechada (Eventos)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`pt-4 border-t ${
                isLight ? 'border-gray-200' : 'border-[#1d222b]'
              }`}
            >
              <a
                href="https://wa.me/553891065054?text=Olá,%20gostaria%20de%20conversar%20sobre%20a%20cobertura%20do%20meu%20evento%20na%20Rocha%20Foto%20e%20Vídeo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Conversar no WhatsApp Oficial</span>
              </a>
            </div>
          </div>

          {/* Contact & Budget Form */}
          <div
            className={`lg:col-span-7 p-8 rounded-2xl border transition-colors ${
              isLight
                ? 'bg-white border-gray-200 shadow-sm'
                : 'bg-[#12151a] border-[#222731]'
            }`}
          >
            <h2
              className={`font-serif-luxury text-2xl mb-2 ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}
            >
              Solicitar Orçamento
            </h2>
            <p
              className={`text-xs mb-6 ${
                isLight ? 'text-gray-600' : 'text-[#9ca3af]'
              }`}
            >
              Preencha os dados do seu evento para recebermos sua solicitação e entrarmos em contato.
            </p>

            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#1e3a24] text-[#4ade80] flex items-center justify-center mx-auto mb-2 border border-[#2b6339]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4
                  className={`text-lg font-serif-luxury ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Mensagem Enviada!
                </h4>
                <p
                  className={`text-xs max-w-sm mx-auto ${
                    isLight ? 'text-gray-600' : 'text-[#9ca3af]'
                  }`}
                >
                  Sua mensagem foi direcionada para nossa equipe no WhatsApp. Responderemos o mais
                  breve possível!
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs text-[#c99e64] hover:underline pt-2 block mx-auto cursor-pointer font-medium"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block font-semibold uppercase mb-1.5 ${
                        isLight ? 'text-gray-700' : 'text-[#9ca3af]'
                      }`}
                    >
                      Seu Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nome e sobrenome"
                      className={`w-full border rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#c99e64] transition-colors ${
                        isLight
                          ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                          : 'bg-[#0c0e11] border-[#242933] text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block font-semibold uppercase mb-1.5 ${
                        isLight ? 'text-gray-700' : 'text-[#9ca3af]'
                      }`}
                    >
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className={`w-full border rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#c99e64] transition-colors ${
                        isLight
                          ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                          : 'bg-[#0c0e11] border-[#242933] text-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block font-semibold uppercase mb-1.5 ${
                        isLight ? 'text-gray-700' : 'text-[#9ca3af]'
                      }`}
                    >
                      Seu E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="seu@email.com"
                      className={`w-full border rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#c99e64] transition-colors ${
                        isLight
                          ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                          : 'bg-[#0c0e11] border-[#242933] text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block font-semibold uppercase mb-1.5 ${
                        isLight ? 'text-gray-700' : 'text-[#9ca3af]'
                      }`}
                    >
                      Tipo de Trabalho / Evento
                    </label>
                    <select
                      value={form.eventType}
                      onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                      className={`w-full border rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#c99e64] transition-colors ${
                        isLight
                          ? 'bg-gray-50 border-gray-300 text-gray-900'
                          : 'bg-[#0c0e11] border-[#242933] text-white'
                      }`}
                    >
                      <option value="Casamento">Casamento</option>
                      <option value="15 Anos / Debutante">15 Anos / Debutante</option>
                      <option value="Ensaio Gestante">Ensaio Gestante</option>
                      <option value="Book / Estúdio">Book / Estúdio Fotográfico</option>
                      <option value="Formatura">Formatura</option>
                      <option value="Aniversário Infantil">Aniversário Infantil</option>
                      <option value="Outro Evento">Outro Evento</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    className={`block font-semibold uppercase mb-1.5 ${
                      isLight ? 'text-gray-700' : 'text-[#9ca3af]'
                    }`}
                  >
                    Data Prevista do Evento (Opcional)
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#c99e64] transition-colors ${
                      isLight
                        ? 'bg-gray-50 border-gray-300 text-gray-900'
                        : 'bg-[#0c0e11] border-[#242933] text-white'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block font-semibold uppercase mb-1.5 ${
                      isLight ? 'text-gray-700' : 'text-[#9ca3af]'
                    }`}
                  >
                    Detalhes ou Dúvidas
                  </label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Conte-nos um pouco sobre como imagina a cobertura do seu evento, local da festa, etc."
                    className={`w-full border rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#c99e64] resize-none transition-colors ${
                      isLight
                        ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
                        : 'bg-[#0c0e11] border-[#242933] text-white'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#c99e64] hover:bg-[#d4af37] text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#c99e64]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Solicitação de Orçamento</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
