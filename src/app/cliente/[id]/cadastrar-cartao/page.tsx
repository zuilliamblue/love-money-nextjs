// CadastrarCartaoPage.tsx — melhorias nos campos e mensagens de erro
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import Image from 'next/image';
import { FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const bancos = [
  'Amazon', 'Alelo', 'Amex', 'Atacadão', 'Banco do Brasil', 'Bradescard', 'BTG', 'BV', 'C6', 'Caixa', 'Confiança',
  'Digio', 'ELO', 'Genial', 'HiperCard', 'Inter', 'Itaú', 'Iti', 'Magazine Luiza', 'MasterCard', 'Mercado Pago',
  'Neon', 'Next', 'Nubank', 'Pan', 'Passaí', 'Pernambucanas', 'PicPay', 'Renner', 'Sams Club', 'Santander',
  'Sodexo', 'Ticket', 'Visa', 'VR', 'Will Bank', 'XP', 'Outros'
];

export default function CadastrarCartaoPage() {
  const { id } = useParams();
  const uid = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [banco, setBanco] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [fechamento, setFechamento] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // apelido do cartão, em título (primeiras letras maiúsculas)
  const [apelido, setApelido] = useState('');


  const isValidDay = (value: string) => {
    const num = Number(value);
    return num >= 1 && num <= 31;
  };

  const input = 'w-full p-3 mb-1 rounded bg-[#1a2a2a] text-white text-center';
  const btn = 'p-3 rounded font-bold w-full';
  const fade = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3 }
  };

  const handleSubmit = async () => {
    if (!banco || !isValidDay(vencimento) || !isValidDay(fechamento)) return;
    setCarregando(true);

    try {
      await addDoc(collection(db, 'usuarios', uid, 'cartoes'), {
  banco,
  apelido,                         // 👈 adiciona aqui
  vencimento: Number(vencimento),
  fechamento: Number(fechamento),
  criadoEm: Timestamp.now(),
});

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push(`/cliente/${uid}/cartoes`);
      }, 1800);
    } catch (e) {
      console.error('Erro ao cadastrar cartão:', e);
      alert('Erro ao cadastrar: verifique as permissões no Firestore.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative">
      {showSuccess && (
        <div className="absolute top-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2">
          <FaCheckCircle /> Cartão cadastrado com sucesso!
        </div>
      )}

      {step > 0 && (
        <button onClick={() => setStep(step - 1)} className="absolute top-4 text-white text-sm flex items-center gap-2">
          <FaArrowLeft /> Voltar
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} {...fade} className="w-full max-w-sm">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">
            {step === 0 && 'Vamos cadastrar seu novo Cartão de Crédito 🙂'}
            {step === 1 && 'Qual é o dia de vencimento do cartão? 📆'}
            {step === 2 && 'Quando é o fechamento da fatura? ✅'}
          </h1>

          {step === 2 && (
            <p className="text-white text-base italic text-center mb-4">
              Ou seu melhor dia de compra, igual vem escrito na sua fatura.
            </p>
          )}

          {step === 0 && (
            <>
              <select
                className={input + ' text-left mb-4'}
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
              >
                <option value="">Selecione seu cartão</option>
                {bancos.map((b) => (
                  <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {banco && (
                 <input
    type="text"
    className={input}
    placeholder="Apelido do cartão (OPCIONAL)"
    value={apelido}
    onChange={e => {
      // capitaliza cada palavra automaticamente
      const formatted = e.target.value
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      setApelido(formatted);
    }}
  />
)}
{banco && (
                <div className="flex flex-col items-center mb-6">
                  <Image
                    src={`/logos/${banco}.png`}
                    alt={banco}
                    width={70}
                    height={70}
                    className="rounded-full object-cover"
                  />
                </div>
              )}
              {banco && (
                <button onClick={() => setStep(1)} className={`${btn} bg-green-400 text-black`}>Continuar</button>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <input
                type="number"
                className={input}
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                placeholder="Dia do vencimento (01 a 31)"
              />
              {!isValidDay(vencimento) && vencimento && (
                <p className="text-red-500 text-sm mb-2">Digite entre 1 e 31</p>
              )}
              {isValidDay(vencimento) && (
                <button onClick={() => setStep(2)} className={`${btn} bg-green-400 text-black mt-2`}>Continuar</button>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <input
                type="number"
                className={input}
                value={fechamento}
                onChange={(e) => setFechamento(e.target.value)}
                placeholder="Dia do fechamento (01 a 31)"
              />
              {!isValidDay(fechamento) && fechamento && (
                <p className="text-red-500 text-sm mb-2">Digite entre 1 e 31</p>
              )}
              {isValidDay(fechamento) && (
                <button onClick={handleSubmit} className={`${btn} bg-green-500 mt-2 text-black`} disabled={carregando}>
                  {carregando ? 'Salvando...' : 'Cadastrar'}
                </button>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ➕ OBS: os arquivos de logo devem estar em /public/logos/ com nomes iguais aos do array bancos
// Exemplo: /public/logos/Nubank.png, /public/logos/Inter.png, /public/logos/Outros.png
