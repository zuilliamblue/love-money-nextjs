// app/cliente/[id]/assinaturas/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import {
  collection, getDocs, doc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { FaTrash, FaEdit, FaBan, FaCog } from 'react-icons/fa';
import { FaSpinner } from 'react-icons/fa';

export default function AssinaturasPage() {
  const { id } = useParams();
  const uid = Array.isArray(id) ? id[0] : id;
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
const [modal, setModal] = useState<null | {
  assinatura: any;
  confirmCancel?: boolean;
  confirmDelete?: boolean;
  editValor?: boolean;
  valorTemp?: any;
}>(null);

  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
  const fetchAssinaturas = async () => {
    setLoading(true);  // <<< Adicione isso aqui!
    // Busca assinaturas de débito
    const snap = await getDocs(collection(db, 'usuarios', uid, 'assinaturas'));
    let lista = snap.docs
      .map(d => ({ id: d.id, ...d.data(), origem: 'debito' } as any))
      .filter(a => !a.canceladaEm);

    // Busca assinaturas dos cartões
    const cartSnap = await getDocs(collection(db, 'usuarios', uid, 'cartoes'));
    for (const docCart of cartSnap.docs) {
      const gastosSnap = await getDocs(
        collection(db, 'usuarios', uid, 'cartoes', docCart.id, 'gastos')
      );
      const gastos = gastosSnap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          cartao: docCart.data().banco,
          cartaoId: docCart.id,
          origem: 'cartao'
        } as any))
        .filter(a => a.tipo === 'assinaturas' && !a.canceladaEm);
      lista = lista.concat(gastos);
    }

    setAssinaturas(lista);
    setLoading(false); // <<< E finalize aqui!
  };
  fetchAssinaturas();
}, [uid]);


  // Excluir assinatura (deleta mesmo do Firestore)
  const excluirAssinatura = async (assinatura: any) => {
    setLoading(true);
    if (assinatura.origem === 'debito') {
      await deleteDoc(doc(db, 'usuarios', uid, 'assinaturas', assinatura.id));
    } else {
      await deleteDoc(doc(db, 'usuarios', uid, 'cartoes', assinatura.cartaoId, 'gastos', assinatura.id));
    }
    setAssinaturas(prev => prev.filter(a => a.id !== assinatura.id));
    setLoading(false);
    setModal(null);
  };

  // Cancelar assinatura (só marca o canceladaEm)
  const cancelarAssinatura = async (assinatura: any) => {
    setLoading(true);
    const ref = assinatura.origem === 'debito'
      ? doc(db, 'usuarios', uid, 'assinaturas', assinatura.id)
      : doc(db, 'usuarios', uid, 'cartoes', assinatura.cartaoId, 'gastos', assinatura.id);
    await updateDoc(ref, { canceladaEm: new Date() });
    setAssinaturas(prev => prev.filter(a => a.id !== assinatura.id));
    setLoading(false);
    setModal(null);
  };

  // Alterar valor
  const alterarValor = async (assinatura: any, novoValor: number) => {
    setLoading(true);
    const ref = assinatura.origem === 'debito'
      ? doc(db, 'usuarios', uid, 'assinaturas', assinatura.id)
      : doc(db, 'usuarios', uid, 'cartoes', assinatura.cartaoId, 'gastos', assinatura.id);
    await updateDoc(ref, { valor: novoValor });
    setAssinaturas(prev =>
      prev.map(a =>
        a.id === assinatura.id ? { ...a, valor: novoValor } : a
      )
    );
    setLoading(false);
    setModal(null);
  };


  useEffect(() => {
  if (aviso) {
    const timer = setTimeout(() => setAviso(''), 3000);
    return () => clearTimeout(timer);
  }
}, [aviso]);

  return (
    <div className="p-2 sm:p-6 max-w-lg sm:max-w-2xl mx-auto text-white">


{loading && (
  <div className="flex justify-center items-center my-10">
    <FaSpinner className="animate-spin text-3xl text-gray-400" />
  </div>
)}



      <h1 className="text-2xl font-bold mb-4">Assinaturas Ativas</h1>

{aviso && (
  <div className="mb-2 text-center bg-green-600 text-white rounded py-2 px-4 font-semibold animate-pulse">
    {aviso}
  </div>
)}

    

{!loading && assinaturas.length === 0 && (
  <div className="text-gray-400">Nenhuma assinatura ativa.</div>
)}

{!loading && assinaturas.map(ass => (
  <div key={ass.id} className="flex justify-between items-center bg-[#222] rounded p-3 my-2">
    <div>
      <div className="font-semibold">{ass.servico || ass.descricao}</div>
      <div className="text-xs text-gray-400">{ass.origem === 'debito' ? 'Débito' : `Cartão: ${ass.cartao}`}</div>
      <div className="text-lg font-bold">{(ass.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
    </div>
    <button
      className="p-2 text-xl text-blue-400 hover:text-blue-600"
      onClick={() => setModal({ assinatura: ass })}
      title="Gerenciar"
    >
      <FaCog />
    </button>
  </div>
))}


      {/* Modal de gerenciamento */}
{modal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-[#222] rounded p-6 max-w-xs w-full space-y-4">
      <h2 className="text-lg font-bold mb-2">Gerenciar Assinatura</h2>
      <div className="font-semibold">{modal.assinatura.servico || modal.assinatura.descricao}</div>

      {/* Valor com edição inline */}
      <div>
        <label className="block text-xs mb-1">Valor</label>
        {!modal.editValor ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {(modal.assinatura.valor || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </span>
            <button
              className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold"
              onClick={() =>
                setModal({
                  ...modal,
                  editValor: true,
                  valorTemp: modal.assinatura.valor
                })
              }
              disabled={loading}
            >
              Alterar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-28 p-2 rounded bg-[#111] mb-0"
              value={modal.valorTemp}
              onChange={e =>
                setModal({ ...modal, valorTemp: e.target.value })
              }
              disabled={loading}
            />
            <button
              className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold"
              onClick={async () => {
                const novoValor = parseFloat(modal.valorTemp);
                if (!isNaN(novoValor) && novoValor !== modal.assinatura.valor) {
                  await alterarValor(modal.assinatura, novoValor);
                  setModal(null); // Fecha o modal após salvar
                  setAviso('Valor alterado com sucesso!');
                } else {
                  setModal({ ...modal, editValor: false });
                }
              }}
              disabled={loading}
            >
              Salvar
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-600 text-white text-xs font-bold"
              onClick={() => setModal({ ...modal, editValor: false })}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Cancelar Assinatura com confirmação extra */}
      {!modal.confirmCancel ? (
        <button
          className="w-full flex items-center gap-2 justify-center py-2 rounded bg-yellow-600 text-white font-bold"
          onClick={() => setModal({ ...modal, confirmCancel: true })}
          disabled={loading}
        >
          <FaBan /> Cancelar Assinatura
        </button>
      ) : (
        <div className="space-y-2">
          <div className="bg-yellow-200 text-yellow-900 rounded p-2 text-sm text-center">
            Tem certeza que deseja cancelar esta assinatura?<br />
            Ela não será mais exibida em meses futuros.
          </div>
          <button
            className="w-full flex items-center gap-2 justify-center py-2 rounded bg-yellow-700 text-white font-bold"
            onClick={async () => {
              await cancelarAssinatura(modal.assinatura);
              setAviso('Assinatura cancelada com sucesso!');
            }}
            disabled={loading}
          >
            Confirmar Cancelamento
          </button>
          <button
            className="w-full flex items-center gap-2 justify-center py-2 rounded bg-gray-600 text-white"
            onClick={() => setModal({ ...modal, confirmCancel: false })}
            disabled={loading}
          >
            Voltar
          </button>
        </div>
      )}

      {/* Excluir Assinatura com confirmação extra */}
      {!modal.confirmDelete ? (
        <button
          className="w-full flex items-center gap-2 justify-center py-2 rounded bg-red-600 text-white font-bold"
          onClick={() => setModal({ ...modal, confirmDelete: true })}
          disabled={loading}
        >
          <FaTrash /> Excluir Assinatura
        </button>
      ) : (
        <div className="space-y-2">
          <div className="bg-red-200 text-red-900 rounded p-2 text-sm text-center">
            Tem certeza que deseja <b>EXCLUIR</b> todos os dados desta assinatura?<br />
            <b>Essa ação é irreversível</b> e irá remover <b>TODOS</b> os registros passados e futuros!
          </div>
          <button
            className="w-full flex items-center gap-2 justify-center py-2 rounded bg-red-700 text-white font-bold"
            onClick={() => excluirAssinatura(modal.assinatura)}
            disabled={loading}
          >
            Confirmar Exclusão
          </button>
          <button
            className="w-full flex items-center gap-2 justify-center py-2 rounded bg-gray-600 text-white"
            onClick={() => setModal({ ...modal, confirmDelete: false })}
            disabled={loading}
          >
            Voltar
          </button>
        </div>
      )}

      <button
        className="w-full flex items-center gap-2 justify-center py-2 rounded bg-gray-600 text-white"
        onClick={() => setModal(null)}
        disabled={loading}
      >
        Fechar
      </button>
    </div>
  </div>
)}



    </div>
  );
}
