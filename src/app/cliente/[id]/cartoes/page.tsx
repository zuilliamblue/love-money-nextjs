'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTotaisPorCartao } from '../hooks/useTotaisPorCartao';


interface Cartao {
  id: string;
  banco: string;
  vencimento: number;
  fechamento: number;
  apelido?: string;
}

// ...
export default function CartoesPage() {
  const { id } = useParams();
  // Garante que uid seja string ou null. Se id for um array, pega o primeiro elemento.
  // Se id for null/undefined, uid será null.
  const uid = id ? (Array.isArray(id) ? id[0] : id) : null;
  const router = useRouter();
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  // Passa uid (que agora pode ser string ou null) para o hook.
  // O hook 'useTotaisPorCartao' precisará lidar com 'uid' sendo null.
  const { totais, loading: loadingTotais, error: errorTotais } = useTotaisPorCartao(uid, anoAtual, mesAtual);

  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  
 const [mesSelecionado, setMesSelecionado] = useState<number>(
   new Date().getMonth()
 );


  const meses = [
    'Escolher',
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  useEffect(() => {
    async function carregarCartoes() {

      // *** Adicione esta verificação AQUI ***
      if (typeof uid === 'undefined' || uid === null) {
        console.warn("UID não disponível para carregar cartões. Abortando busca.");
        return; // Sai da função se uid for undefined ou null
      }
      // ************************************


      const ref = collection(db, 'usuarios', uid, 'cartoes');
      const snap = await getDocs(ref);
      const lista: Cartao[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        lista.push({
          id: doc.id,
          banco: data.banco,
          vencimento: data.vencimento,
          fechamento: data.fechamento,
          apelido: data.apelido,
        });
      });
      setCartoes(lista);
    }

    carregarCartoes();
  }, [uid]);



  return (
    <div className="min-h-screen bg-black text-white p-4">

       {/* Bloco com ícone acima e título abaixo, ambos centralizados */}
 <div className="w-full flex flex-col items-center mb-4">
   {/* Ícone maior (ajuste “text-6xl” para outro tamanho se preferir) */}
   <span className="text-6xl">💳</span>
   {/* Título “Meus Cartões” centralizado abaixo do ícone */}
   <h1 className="text-2xl font-bold mt-2">Meus Cartões</h1>
 </div>

      <Link
        href={`/cliente/${uid}/cadastrar-cartao`}
        className="inline-block mb-6 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-bold"
      >
        + Cadastrar Cartão
      </Link>


      {/* Lista de cartões */}
      <div className="grid gap-4">
        {cartoes.map((cartao) => (
          <div
            key={cartao.id}
            className="bg-[#1a2a2a] p-4 rounded shadow hover:bg-[#223] cursor-pointer"
          //  onClick={() =>
          //    alert(
           //     `Aqui você vai mostrar as despesas do cartão ${cartao.banco} no mês selecionado (${mesSelecionado + 1})`
           //   )
          //  }
          >
            <div className="flex items-center gap-4">
              <Image
                src={`/images/${cartao.banco}.png`}
                alt={cartao.banco}
                width={50}
                height={50}
                className="rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold">
  {cartao.banco}
  {cartao.apelido ? ` – ${cartao.apelido}` : ''}
</h2>
                <p className="text-sm text-white/70">
                  Vencimento: dia {cartao.vencimento}
                </p>
                <p className="text-sm text-white/70">
                  Fechamento: dia {cartao.fechamento}
                </p>
              </div>
                   <div className="ml-auto text-right">
        <p className="text-lg font-bold text-green-400">
          {/*
            Se já tivermos o total calculado em `totais[cartao.id]`, formatamos.
            Caso contrário (ainda carregando ou sem valores), mostramos “R$ 0,00”.
            Se ocorrer erro no hook, também exibimos “R$ 0,00” por enquanto.
          */}
          {typeof totais[cartao.id] !== 'undefined'
            ? totais[cartao.id].toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : 'R$ 0,00'}
        </p>
        <span className="text-xs text-white/40">
          {format(new Date(anoAtual, mesAtual, 1), 'MMMM yyyy', {
            locale: ptBR,
          })}
        </span>
      </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
