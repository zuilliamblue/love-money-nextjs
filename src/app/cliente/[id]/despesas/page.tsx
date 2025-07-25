// page.tsx (Versão Absolutamente Completa e Consolidada)

'use client';

// --- Importações ---
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  FaSpinner,
  FaCog,
  FaRegCreditCard,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  // FaBolt, // Removido, Pix usará símbolo textual
  FaHome,
  FaUniversity,
  FaTv,
} from 'react-icons/fa';

// --- Constantes e Funções Utilitárias ---
const cardColors: Record<string, string> = { Amazon: '#483D8B', Alelo: '#006400', Amex: '#87CEEB', Atacadão: '#B8860B', 'Banco do Brasil': '#FFD700', Bradescard: '#FF0000', BTG: '#FFA500', BV: '#89CFF0', C6: '#000000', Caixa: '#0072C6', Confiança: '#005A9C', Digio: '#0057B8', Elo: '#008000', Genial: '#1E90FF', HiperCard: '#4169E1', Inter: '#FF8C00', Itaú: 'linear-gradient(to right, #CC7000, #FF8C00)', Iti: '#FF69B4', 'Magazine Luiza': '#3B82F6', Mastercard: '#FF0000', 'Mercado Pago': 'linear-gradient(to right, #CCA300, #FFD700)', Neon: '#2563EB', Next: 'linear-gradient(to right, #2E8B57, #90EE90)', Nubank: '#800080', Pan: '#3B82F6', Passaí: '#8B4513', Pernambucanas: '#FFD700', PicPay: '#008000', Renner: '#FF0000', 'Sams Club': '#1E40AF', Santander: 'linear-gradient(to right, #990000, #CC0000)', Sodexo: '#1E3A8A', Ticket: '#1D4ED8', Visa: '#FFA500', VR: '#008000', 'Will Bank': '#FFD700', XP: '#000000', Outros: '#FFF5E1' };
const formatBRL = (num = 0) => num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getCicloFaturaPorVencimento(ano: number, mes: number, diaFechamento: number, diaVencimento: number) {
  const vencimento = new Date(ano, mes, diaVencimento, 0, 0, 0, 0);
  let fechamentoMes = mes;
  let fechamentoAno = ano;
  if (diaFechamento >= diaVencimento) {
    fechamentoMes = mes - 1;
    if (fechamentoMes < 0) { fechamentoMes = 11; fechamentoAno--; }
  }
  const fechamento = new Date(fechamentoAno, fechamentoMes, diaFechamento, 0, 0, 0, 0);
  let inicioMes = fechamentoMes - 1;
  let inicioAno = fechamentoAno;
  if (inicioMes < 0) { inicioMes = 11; inicioAno--; }
  const inicio = new Date(inicioAno, inicioMes, diaFechamento, 0, 0, 0, 0);
  return { inicio, fim: fechamento };
}

// --- Componentes de UI Reutilizáveis ---
function CategoriaToggle({ icon, titulo, total, children, corFundo }: { icon: JSX.Element; titulo: string; total: string; children: React.ReactNode; corFundo?: string; }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mt-6">
      <div className={`flex justify-between items-center px-4 py-2 rounded-t-lg cursor-pointer ${corFundo || 'bg-gray-200 text-black'}`} onClick={() => setAberto(!aberto)}>
        <div className="flex items-center gap-2 font-semibold">{icon}<span>{titulo}</span></div>
        <span>{total}</span>
      </div>
      {aberto && <div className="bg-[#1a1a1a] text-white px-4 py-3 space-y-2 rounded-b-lg">{children}</div>}
    </div>
  );
}

function CartaoBox({ i, setModalGasto }: any) { 
  const [aberto, setAberto] = useState(false);
  const totalCartao = i.gastos.reduce((s: number, g: any) => s + (g.valor || 0), 0);
  function renderPeriodoFatura() {
    if (!i.cicloFatura) return null;
    const fimExibicao = new Date(i.cicloFatura.fim.getTime() - 86400000);
    return <span className="block text-xs text-gray-200 mt-1">Fatura: {i.cicloFatura.inicio.toLocaleDateString()} a {fimExibicao.toLocaleDateString()}</span>;
  }
  return (
    <div className="mb-3 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
      <div className="flex flex-col cursor-pointer px-4 py-3" onClick={() => setAberto(!aberto)} style={{ background: cardColors[i.banco] || cardColors['Outros'] }}>
        <span className="font-bold text-white text-lg">{i.banco}</span>
        {renderPeriodoFatura()}
        <div className="flex justify-between items-center mt-2">
          <span className="font-bold text-white text-base">{formatBRL(totalCartao)}</span>
          <svg className={`ml-2 transition-transform ${aberto ? "rotate-90" : ""}`} width={18} height={18} viewBox="0 0 24 24" fill="none"><path d="M8 10L12 14L16 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      {aberto && (
        <div className="bg-[#232334] p-3 space-y-2">
          {i.gastos.length === 0 && <div className="text-gray-300">Nenhuma despesa neste mês.</div>}
          {[...i.gastos].sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0)).map((g: any) => (
            <div key={g.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-700 last:border-b-0">
              <span className="truncate flex-grow mr-2 flex items-baseline flex-wrap">
                <span className="font-semibold text-sm">{g.descricao}</span>
                {g.categoria && <span className="ml-2 text-xs text-gray-400">{g.categoria}</span>}
                {g.parcela && g.totalParcelas && <span className="ml-2 text-xs text-gray-400">{`${g.parcela}/${g.totalParcelas}`}</span>}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span>{formatBRL(g.valor)}</span>
                <button onClick={() => {
                  const valorOriginal = g.valorParcela !== undefined ? g.valorParcela : g.valor;
                  setModalGasto({
                    gasto: g,
                    cartao: { cartaoId: i.cartaoId, banco: i.banco },
                    key: 'cartoes',
                    tempDescricao: g.descricao || '',
                    tempValor: String(valorOriginal || 0),
                    isParcela: g.valorParcela !== undefined,
                    confirmExcluir: false,
                  });
                }} className="text-blue-400" title="Gerenciar lançamento"><FaCog /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Tipos para os Modais e Dados ---
interface ModalGastoState {
  gasto: any;
  cartao?: { cartaoId: string; banco: string };
  key: string;
  confirmExcluir?: boolean;
  tempDescricao: string;
  tempValor: string;
  isParcela?: boolean;
}

interface ParcelaFirestoreData {
  parcela?: number;
  parcelasTotais?: number;
  data?: Timestamp;
  dataPagamento?: Timestamp;
  descricao?: string;
  valor?: number;
  valorParcela?: number;
  beneficiario?: string;
  financiamento?: string;
  banco?: string;
  categoria?: string;
  servico?: string; 
  recorrente?: boolean; 
  canceladaEm?: Timestamp; 
  origem?: "debito" | "cartao";
  cartao?: string; 
  cartaoId?: string;
  tipo?: string; 
  chaveUnica?: string;
  criadoEm?: Timestamp;
  [key: string]: any; 
}

interface ParcelaDoc extends ParcelaFirestoreData {
  id: string;
}

interface ModalEditarState {
  parcelas: ParcelaDoc[]; 
  parentCollectionKey: string; 
  parentItemChaveUnica: string;
  cardSpecific_CartaoId?: string; 
  viewParcelas: boolean; 
  dataParaAlteracaoGlobal: string; 
}

// --- Componente Principal da Página ---
export default function DespesasPage() {
  const { id } = useParams();
  const uid = Array.isArray(id) ? id[0] : id;
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [dados, setDados] = useState<Record<string, ParcelaDoc[] | any[]>>({}); // any[] para cartoes que tem estrutura diferente
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState('');
  
  const [modalGasto, setModalGasto] = useState<ModalGastoState | null>(null);
  const [modalEditar, setModalEditar] = useState<ModalEditarState | null>(null);
  const [modalInfo, setModalInfo] = useState<any>(null);
  
  const [listaSize, setListaSize] = useState(10); 
  const [editarParcelaIdx, setEditarParcelaIdx] = useState<null | number>(null); 
  const [dataParcelaTemp, setDataParcelaTemp] = useState(''); 
  const [valorParcelaTemp, setValorParcelaTemp] = useState(0); 

  const anosDisponiveis = Array.from({ length: hoje.getFullYear() - 2023 + 1 }, (_, i) => 2024 + i);
  
const categorias = [
  { key: 'gastos', titulo: 'Gastos', icon: <FaMoneyBillWave />, cor: 'bg-green-600 text-white', campoValor: 'valor', campoNome: 'categoria', temChaveUnica: false, dateField: 'data' as const },
  { key: 'assinaturas', titulo: 'Assinaturas', icon: <FaTv />, cor: 'bg-[#5F9EA0] text-white', campoValor: 'valor', campoNome: 'servico', temChaveUnica: false, dateField: 'diaPagamento' as const },
  { key: 'boletos', titulo: 'Boletos', icon: <FaFileInvoiceDollar />, cor: 'bg-blue-700 text-white', campoValor: 'valorParcela', campoNome: 'descricao', temChaveUnica: true, dateField: 'dataPagamento' as const },
  { key: 'pix', titulo: 'Pix Parcelado', icon: <span className="font-bold text-xl">❖</span>, cor: 'bg-orange-500 text-white', campoValor: 'valorParcela', campoNome: 'descricao', temChaveUnica: true, dateField: 'dataPagamento' as const },
  { key: 'cartoes', titulo: 'Cartões', icon: <FaRegCreditCard />, cor: 'bg-gray-900 text-white', campoValor: 'valor', campoNome: 'descricao', subcolecao: true, temChaveUnica: true, dateField: 'data' as const },
  { key: 'financiamentos', titulo: 'Financiamentos', icon: <FaHome />, cor: 'bg-red-600 text-white', campoValor: 'valorParcela', campoNome: 'descricao', temChaveUnica: true, dateField: 'dataPagamento' as const },
  { key: 'emprestimos', titulo: 'Empréstimos', icon: <FaUniversity />, cor: 'bg-purple-600 text-white', campoValor: 'valorParcela', campoNome: 'banco', temChaveUnica: true, dateField: 'dataPagamento' as const }
];

  const getDateFieldName = (collectionKey: string): 'data' | 'dataPagamento' => {
    const categoriaConfig = categorias.find(cat => cat.key === collectionKey);
    const field = categoriaConfig?.dateField;
    // Map "diaPagamento" to "dataPagamento" to satisfy the return type
    if (field === 'diaPagamento') return 'dataPagamento';
    return field || 'data';
  };
  
  const carregarDados = async () => { 
    if(!uid) { setLoading(false); return; }
    setLoading(true);
    const inicioMesDate = new Date(ano, mes, 1, 0,0,0,0);
    const fimMesDate = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const inicioMesTimestamp = Timestamp.fromDate(inicioMesDate);
    const fimMesTimestamp = Timestamp.fromDate(fimMesDate);
    const temp: Record<string, ParcelaDoc[] | any[]> = {}; // any[] para cartoes

    await Promise.all(
      categorias.map(async ({ key, subcolecao, dateField: categoryDateField }) => {
        if (subcolecao && key === 'cartoes') {
          const cartSnap = await getDocs(collection(db, 'usuarios', uid, 'cartoes'));
          const arr: any[] = [];
          for (const docCart of cartSnap.docs) {
            const cartaoData = docCart.data();
            const { fechamento, vencimento, banco } = cartaoData;
            if (!fechamento || !vencimento) continue;
            const ciclo = getCicloFaturaPorVencimento(ano, mes, fechamento, vencimento);
            const cicloInicioTimestamp = Timestamp.fromDate(ciclo.inicio);
            const cicloFimTimestamp = Timestamp.fromDate(ciclo.fim);

            const gastosSnap = await getDocs(query(
              collection(db, 'usuarios', uid, 'cartoes', docCart.id, 'gastos'),
              where(categoryDateField, '>=', cicloInicioTimestamp),
              where(categoryDateField, '<', cicloFimTimestamp) 
            ));
            const list: ParcelaDoc[] = gastosSnap.docs.map(d => ({ id: d.id, ...(d.data() as ParcelaFirestoreData) }));
            if (list.length) {
              arr.push({ cartaoId: docCart.id, banco, gastos: list, cicloFatura: { inicio: ciclo.inicio, fim: new Date(ciclo.fim.getTime() - 86400000) } });
            }
          }
          temp[key] = arr;
        } else if (key === 'assinaturas') {
          let todasAssinaturas: ParcelaDoc[] = [];
const debitoSnap = await getDocs(query(collection(db, 'usuarios', uid, 'assinaturas')));          const assinaturasDebito = debitoSnap.docs
            .map(d => ({ id: d.id, ...(d.data() as ParcelaFirestoreData), origem: 'debito' as const }))
           .filter((a: ParcelaDoc) => {
      const categoryDateFieldParaAssinatura = categorias.find(c => c.key === 'assinaturas')?.dateField || 'diaPagamento';
      const dataInicioAssinatura = a[categoryDateFieldParaAssinatura]?.toDate();
      if (!dataInicioAssinatura) { console.warn("Assinatura (débito) sem data de início:", a.id); return false; }
      if (dataInicioAssinatura.getTime() > fimMesTimestamp.toMillis()) return false;
      if (a.recorrente === true) return true;
      else {
          const canceladaEm = a.canceladaEm?.toDate();
          if (!canceladaEm) return false; 
          const inicioDoDiaCancelamento = new Date(canceladaEm.getFullYear(), canceladaEm.getMonth(), canceladaEm.getDate(), 0,0,0,0);
          return inicioMesTimestamp.toMillis() <= inicioDoDiaCancelamento.getTime();
      }
  });
          todasAssinaturas = todasAssinaturas.concat(assinaturasDebito);

          const cartoesSnap = await getDocs(collection(db, 'usuarios', uid, 'cartoes'));
          for (const docCart of cartoesSnap.docs) {
const gastosAssinaturaSnap = await getDocs(query( collection(db, 'usuarios', uid, 'cartoes', docCart.id, 'gastos'), where('tipo', '==', 'assinaturas')));            const assinaturasCartao = gastosAssinaturaSnap.docs
              .map(d => ({ id: d.id, ...(d.data() as ParcelaFirestoreData), cartao: docCart.data().banco, cartaoId: docCart.id, origem: 'cartao' as const}))
             .filter((a: ParcelaDoc) => { // 'a' é um documento de .../gastos onde tipo === 'assinaturas'
    // Para assinaturas baseadas em cartão, usamos diretamente 'diaPagamento'
    const dataInicioAssinatura = a.diaPagamento?.toDate();

    if (!dataInicioAssinatura) { 
        console.warn("Assinatura (cartão) sem campo 'diaPagamento' ou campo inválido:", a.id, a); 
        return false; 
    }

    // Condição 1: A assinatura deve ter iniciado até o final do mês visualizado
    if (dataInicioAssinatura.getTime() > fimMesTimestamp.toMillis()) {
        return false; 
    }

    // Condição 2: Lógica para assinaturas ativas ou canceladas
    if (a.recorrente === true) {
        return true; // Se for recorrente e já iniciou, mostrar
    } else { 
        // Se recorrente for false, verificar a data de cancelamento
        const canceladaEm = a.canceladaEm?.toDate();
        if (!canceladaEm) {
            // Marcada como não recorrente mas sem data de cancelamento? Não mostrar por segurança.
            console.warn("Assinatura (cartão) não recorrente mas sem data de cancelamento:", a.id);
            return false; 
        }
        // Mostrar se o início do mês visualizado é ANTES ou IGUAL ao mês/ano de cancelamento.
        const inicioDoDiaCancelamento = new Date(canceladaEm.getFullYear(), canceladaEm.getMonth(), canceladaEm.getDate(), 0,0,0,0);
        return inicioMesTimestamp.toMillis() <= inicioDoDiaCancelamento.getTime();
    }
})
            todasAssinaturas = [...todasAssinaturas, ...assinaturasCartao];
          }
          temp[key] = todasAssinaturas;
        } else { 
            const q = query(collection(db, 'usuarios', uid, key), 
                            where(categoryDateField!, '>=', inicioMesTimestamp), 
                            where(categoryDateField!, '<=', fimMesTimestamp));
            const snap = await getDocs(q);
            temp[key] = snap.docs.map(d => ({ id: d.id, ...(d.data() as ParcelaFirestoreData) }));
        }
      })
    );
    setDados(temp);
    setLoading(false);
  };

  useEffect(() => { if (uid) carregarDados(); }, [uid, ano, mes]);
  useEffect(() => { if (aviso) { const timer = setTimeout(() => setAviso(''), 3000); return () => clearTimeout(timer); } }, [aviso]);
  
  const requestCancel = (itemId: string, cartaoId?: string) => setModalInfo({ type: 'cancel', itemId, cartaoId, message: 'Deseja cancelar esta assinatura?' });

const confirmAction = async () => {
  if (!modalInfo) {
    console.log("[DEBUG] confirmAction chamada, mas modalInfo está nulo."); // Log de depuração
    return;
  }

  console.log("[DEBUG] confirmAction iniciada para:", JSON.stringify(modalInfo)); // Log de depuração com stringify

  if (modalInfo.type === 'cancel') {
    setLoading(true);
    const { itemId, cartaoId } = modalInfo;

    // ----- NOVOS CONSOLE.LOG PARA DEPURAÇÃO -----
    console.log("[DEBUG] Valor bruto de uid:", uid);
    console.log("[DEBUG] Tipo de uid:", typeof uid);
    console.log("[DEBUG] Valor bruto de itemId:", itemId);
    console.log("[DEBUG] Tipo de itemId:", typeof itemId);
    if (cartaoId) {
        console.log("[DEBUG] Valor bruto de cartaoId:", cartaoId);
        console.log("[DEBUG] Tipo de cartaoId:", typeof cartaoId);
    }
    // ----- FIM DOS NOVOS CONSOLE.LOG -----
    
    let docRefPath: string;
    if (cartaoId) {
      docRefPath = `usuarios/${uid}/cartoes/${cartaoId}/gastos/${itemId}`;
      console.log("[DEBUG] Path construído para CARTÃO:", docRefPath);
    } else {
      docRefPath = `usuarios/${uid}/assinaturas/${itemId}`;
      console.log("[DEBUG] Path construído para ASSINATURA DIRETA:", docRefPath);
    }
    
    try {
      console.log("[DEBUG] Tentando atualizar documento em:", docRefPath);
      await updateDoc(doc(db, docRefPath), { 
        recorrente: false, 
        canceladaEm: Timestamp.now() 
      });
      setAviso('Assinatura cancelada.');
      console.log("[DEBUG] Documento atualizado com sucesso no Firestore.");
    } catch (error) {
      console.error("[DEBUG] Erro detalhado ao cancelar assinatura:", error);
      setAviso('Erro ao cancelar assinatura. Verifique o console para detalhes.');
    } finally {
      await carregarDados();
      setModalInfo(null); 
      setLoading(false);
      console.log("[DEBUG] Ação de cancelamento finalizada.");
    }
  } else if (modalInfo.type === 'delete') {
    console.log("[DEBUG] Iniciando exclusão via handleExcluirLancamento...");
    await handleExcluirLancamento(); 
    setModalInfo(null); 
    console.log("[DEBUG] Exclusão finalizada.");
  } else {
    console.log("[DEBUG] Tipo de ação desconhecido no modalInfo:", modalInfo.type);
  }
};

  const totalGeral = useMemo(() => { 
    return categorias.reduce((total, cat) => {
      const items: any[] = dados[cat.key] || []; // Usar any[] aqui para acomodar a estrutura diferente de 'cartoes'
      if (cat.subcolecao && cat.key === 'cartoes') { 
        return total + items.reduce((sum: number, c) => sum + (c.gastos || []).reduce((s: number, g: any) => s + (g.valor || 0), 0), 0); 
      }
      return total + items.reduce((sum, i) => sum + (i[cat.campoValor!] || 0), 0);
    }, 0);
  }, [dados]);

  if (loading && !modalGasto && !modalEditar) return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-4xl text-gray-500" /></div>;

  const handleExcluirLancamento = async () => { 
    if (!modalGasto) return; setLoading(true);
    const { gasto, cartao, key } = modalGasto; const batch = writeBatch(db);
    try {
      if (gasto.chaveUnica && key !== 'gastos' && key !== 'assinaturas') {
        const collectionPath = cartao?.cartaoId ? `usuarios/${uid}/cartoes/${cartao.cartaoId}/gastos` : `usuarios/${uid}/${key}`;
        const q = query(collection(db, collectionPath), where('chaveUnica', '==', gasto.chaveUnica));
        const snapshot = await getDocs(q); snapshot.forEach(doc => batch.delete(doc.ref));
      } else {
        const docPath = cartao?.cartaoId ? `usuarios/${uid}/cartoes/${cartao.cartaoId}/gastos/${gasto.id}` : `usuarios/${uid}/${key}/${gasto.id}`;
        batch.delete(doc(db, docPath));
      }
      await batch.commit(); setAviso('Lançamento(s) excluído(s) com sucesso!');
    } catch (error) { console.error("Erro ao excluir:", error); setAviso('Erro ao excluir lançamento.'); }
    finally { setModalGasto(null); await carregarDados(); setLoading(false); }
  };

  const handleSalvarLancamento = async () => { 
    if (!modalGasto) return; setLoading(true);
    const { gasto, cartao, key, tempDescricao, tempValor, isParcela } = modalGasto;
    const valorNumerico = parseFloat(tempValor);
    if (isNaN(valorNumerico)) { setLoading(false); setAviso("Valor inválido."); return; }
    const batch = writeBatch(db); const dadosParaAtualizar: any = { descricao: tempDescricao };
    if (isParcela) { dadosParaAtualizar.valorParcela = valorNumerico; } else { dadosParaAtualizar.valor = valorNumerico; }
    try {
      if (gasto.chaveUnica && key !== 'gastos' && key !== 'assinaturas') {
        const collectionPath = cartao?.cartaoId ? `usuarios/${uid}/cartoes/${cartao.cartaoId}/gastos` : `usuarios/${uid}/${key}`;
        const q = query(collection(db, collectionPath), where('chaveUnica', '==', gasto.chaveUnica));
        const snapshot = await getDocs(q); if (snapshot.empty) { throw new Error("Nenhum documento encontrado com a chaveUnica para atualizar."); }
        snapshot.forEach(doc => batch.update(doc.ref, dadosParaAtualizar));
      } else {
        const docPath = cartao?.cartaoId ? `usuarios/${uid}/cartoes/${cartao.cartaoId}/gastos/${gasto.id}` : `usuarios/${uid}/${key}/${gasto.id}`;
        batch.update(doc(db, docPath), dadosParaAtualizar);
      }
      await batch.commit(); setAviso('Lançamento atualizado com sucesso!');
    } catch (error) { console.error("Erro ao salvar:", error); setAviso(`Erro ao salvar: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setModalGasto(null); await carregarDados(); setLoading(false); }
  };
  
  const mostrarEditarParcelas = modalGasto && modalGasto.gasto.chaveUnica && categorias.find(cat => cat.key === modalGasto.key)?.temChaveUnica;

  return (
    <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto text-white relative">
      {aviso && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded shadow-xl z-[9999] font-bold animate-pulse">{aviso}</div>}

      {/* MODAL: Edição de parcelas individuais (`modalEditar`) */}
      {modalEditar && modalEditar.viewParcelas && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4">
          <div className="bg-[#232334] p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
            <button className="text-blue-400 font-semibold mb-2" onClick={() => { setModalEditar(null); setEditarParcelaIdx(null); }}>← Voltar</button>
            <h3 className="text-lg font-bold">Editar Parcelas</h3>
            <ul className="divide-y divide-gray-600 max-h-80 overflow-y-auto">
              {modalEditar.parcelas.slice(0, listaSize).map((parc, idx) => {
                const parcelaDateFieldKey = getDateFieldName(modalEditar.parentCollectionKey);
                const dataDaParcela = parc[parcelaDateFieldKey] as Timestamp | undefined;
                return (
                  <li key={parc.id || idx} className="py-3 flex flex-col space-y-2">
                    {editarParcelaIdx === idx ? (
                      <>
                        <input type="date" className="w-full p-2 rounded bg-[#111] text-white border border-gray-600" value={dataParcelaTemp} onChange={e => setDataParcelaTemp(e.target.value)} />
                        <input type="number" step="0.01" className="w-full p-2 rounded bg-[#111] text-white border border-gray-600" value={valorParcelaTemp} onChange={e => setValorParcelaTemp(Number(e.target.value))} />
                        <div className="flex gap-2">
                          <button className="flex-1 py-2 rounded bg-green-600 text-white font-bold" onClick={async () => {
                            setLoading(true);
                            try {
                              const [year, month, day] = dataParcelaTemp.split('-').map(Number);
                              const novaData = new Date(year, month - 1, day, 12);
                              let docPathForParcelUpdate: string;
                              if (modalEditar.parentCollectionKey === 'cartoes' && modalEditar.cardSpecific_CartaoId) {
                                  docPathForParcelUpdate = `usuarios/${uid}/cartoes/${modalEditar.cardSpecific_CartaoId}/gastos/${parc.id}`;
                              } else {
                                  docPathForParcelUpdate = `usuarios/${uid}/${modalEditar.parentCollectionKey}/${parc.id}`;
                              }
                              const camposParaAtualizar: any = { [parcelaDateFieldKey]: Timestamp.fromDate(novaData) };
                              if (parc.valorParcela !== undefined) { camposParaAtualizar.valorParcela = valorParcelaTemp; } 
                              else { camposParaAtualizar.valor = valorParcelaTemp; }
                              await updateDoc(doc(db, docPathForParcelUpdate), camposParaAtualizar);
                              setAviso("Parcela atualizada!");
                              await carregarDados(); setModalEditar(null); setEditarParcelaIdx(null);
                            } catch(e) { console.error(e); setAviso("Erro ao atualizar parcela.")}
                            finally { setLoading(false); }
                          }}>Salvar</button>
                          <button className="flex-1 py-2 rounded bg-gray-600 text-white" onClick={() => setEditarParcelaIdx(null)}>Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-white">
                          {dataDaParcela?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">{formatBRL(parc.valorParcela !== undefined ? parc.valorParcela : (parc.valor || 0) )}</span>
                          <button className="text-indigo-400" onClick={() => { 
                              setEditarParcelaIdx(idx); 
                              setDataParcelaTemp(dataDaParcela?.toDate?.().toISOString().slice(0, 10) || ''); 
                              setValorParcelaTemp(parc.valorParcela !== undefined ? parc.valorParcela : (parc.valor || 0)); 
                          }}>Editar</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {listaSize < modalEditar.parcelas.length && <button className="block mx-auto text-sm text-gray-400" onClick={() => setListaSize(prev => prev + 10)}>Ver mais</button>}
          </div>
        </div>
      )}
      
      {modalEditar && !modalEditar.viewParcelas && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4">
          <div className="bg-[#232334] p-6 rounded-lg shadow-xl w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold mb-2">Alterar Data do Primeiro Lançamento</h2>
            <div>
              <label className="block mb-1 text-xs">Nova Data</label>
              <input type="date" className="w-full p-2 rounded bg-[#111] text-white border border-gray-600" value={modalEditar.dataParaAlteracaoGlobal} 
                     onChange={e => setModalEditar(prev => prev ? {...prev, dataParaAlteracaoGlobal: e.target.value} : null)} />
              <div className="text-xs text-gray-300 mt-1">Todas as parcelas ({modalEditar.parcelas.length}) desta chave única terão a data ajustada sequencialmente.</div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 rounded bg-green-600 text-white font-bold" onClick={async () => {
                setLoading(true);
                try {
                    const [year, month, day] = (modalEditar.dataParaAlteracaoGlobal).split('-').map(Number);
                    const dataBase = new Date(year, month - 1, day, 12, 0, 0, 0);
                    const batchLocal = writeBatch(db); // Renomeado para evitar conflito com 'batch' global se houver
                    let collectionPathForUpdate: string;
                    const dateFieldNameForUpdate = getDateFieldName(modalEditar.parentCollectionKey);
                    if (modalEditar.parentCollectionKey === 'cartoes' && modalEditar.cardSpecific_CartaoId) {
                        collectionPathForUpdate = `usuarios/${uid}/cartoes/${modalEditar.cardSpecific_CartaoId}/gastos`;
                    } else {
                        collectionPathForUpdate = `usuarios/${uid}/${modalEditar.parentCollectionKey}`;
                    }
                    const parcelasOrdenadas = [...modalEditar.parcelas].sort((a,b) => (a.parcela || 0) - (b.parcela || 0));
                    parcelasOrdenadas.forEach((parcDoc, i) => {
                        const novaData = new Date(dataBase);
                        novaData.setMonth(dataBase.getMonth() + i);
                        const docRef = doc(db, collectionPathForUpdate, parcDoc.id);
                        batchLocal.update(docRef, { [dateFieldNameForUpdate]: Timestamp.fromDate(novaData) });
                    });
                    await batchLocal.commit(); setAviso("Datas das parcelas atualizadas!");
                    await carregarDados(); setModalEditar(null);
                } catch(e) { console.error(e); setAviso("Erro ao atualizar datas.")}
                finally { setLoading(false); }
              }}>Salvar</button>
              <button className="flex-1 py-2 rounded bg-gray-600 text-white" onClick={() => setModalEditar(null)}>Cancelar</button>
            </div>
             <button className="w-full mt-2 py-1 text-sm text-blue-400 hover:underline" 
                    onClick={() => setModalEditar(prev => prev ? {...prev, viewParcelas: true} : null)}>
                Ou editar parcelas individualmente...
            </button>
          </div>
        </div>
      )}

      {modalGasto && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[900] p-4">
          <div className="bg-[#232334] p-6 rounded-lg shadow-xl w-full max-w-sm space-y-4 relative">
            {loading && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"><FaSpinner className="animate-spin h-8 w-8 text-white" /></div>}
            <h2 className="text-xl font-bold">Gerenciar Lançamento</h2>
            <button
  className="w-full py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
  onClick={() => {
    setModalInfo({
      type: 'delete',
      message: "Tem certeza que deseja excluir este lançamento e todas as suas parcelas (se houver)?",
    });
  }}
  disabled={loading}
>
  Excluir Lançamento
</button>
            {mostrarEditarParcelas && (
              <button className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                onClick={async () => {
                  if (!uid || !modalGasto || !modalGasto.gasto.chaveUnica) return; setLoading(true);
                  const { gasto, cartao, key } = modalGasto; let fullFirestorePathForQuery: string;
                  if (key === 'cartoes' && cartao?.cartaoId) { fullFirestorePathForQuery = `usuarios/${uid}/cartoes/${cartao.cartaoId}/gastos`; } 
                  else { fullFirestorePathForQuery = `usuarios/${uid}/${key}`; }
                  try {
                    const q = query(collection(db, fullFirestorePathForQuery), where('chaveUnica', '==', gasto.chaveUnica));
                    const snap = await getDocs(q);
                    const parcelasArr: ParcelaDoc[] = snap.docs.map(docSnapshot => { const data = docSnapshot.data() as ParcelaFirestoreData; return { id: docSnapshot.id, ...data }; }).sort((a, b) => (a.parcela || 0) - (b.parcela || 0));
                    if (parcelasArr.length > 0) {
                      const firstParcelDateFieldName = getDateFieldName(key);
                      const firstParcelDate = parcelasArr[0]?.[firstParcelDateFieldName] as Timestamp | undefined;
                      setModalEditar({ parcelas: parcelasArr, parentCollectionKey: key, parentItemChaveUnica: gasto.chaveUnica, cardSpecific_CartaoId: (key === 'cartoes' && cartao?.cartaoId) ? cartao.cartaoId : undefined, viewParcelas: true, dataParaAlteracaoGlobal: firstParcelDate?.toDate?.().toISOString().slice(0,10) || '' });
                      setModalGasto(null); 
                    } else { setAviso("Nenhuma parcela encontrada para esta chaveÚnica."); }
                  } catch (error) { console.error("Erro ao buscar parcelas:", error); setAviso("Erro ao buscar parcelas."); }
                  finally { setLoading(false); }
                }} disabled={loading}>
                Editar Parcelas
              </button>
            )}
            <div className="mt-2">
              <label htmlFor="tempDescricaoModalGasto" className="block text-xs mb-1 text-gray-300">Descrição</label>
              <input id="tempDescricaoModalGasto" type="text" value={modalGasto.tempDescricao} onChange={e => setModalGasto(prev => prev ? { ...prev, tempDescricao: e.target.value } : null)} className="w-full p-2 rounded bg-[#111] text-white font-semibold border border-gray-600 focus:ring-2 focus:ring-blue-500" disabled={loading} />
            </div>
            <div>
              <label htmlFor="tempValorModalGasto" className="block text-xs mb-1 text-gray-300">{modalGasto.isParcela ? "Valor da Parcela" : "Valor"}</label>
              <input id="tempValorModalGasto" type="number" step="0.01" value={modalGasto.tempValor} onChange={e => { let v = e.target.value; if (v.includes('.')) { v = v.replace(/^(\d+)\.(\d{0,2}).*$/, '$1.$2'); } setModalGasto(prev => prev ? { ...prev, tempValor: v } : null);}} className="w-full p-2 rounded bg-[#111] text-white font-semibold border border-gray-600 focus:ring-2 focus:ring-blue-500" disabled={loading} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleSalvarLancamento} disabled={loading}>Salvar</button>
              <button className="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white" onClick={() => setModalGasto(null)} disabled={loading}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      
      {modalInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg text-white shadow-xl">
            <p className="mb-4">{modalInfo.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalInfo(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancelar</button>
              <button onClick={confirmAction} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-8 flex justify-between items-center"> 
          <div className="flex gap-4">
            <div>
              <label className="block text-xs mb-1 text-gray-300">Mês</label>
              <select value={mes} onChange={e => setMes(Number(e.target.value))} className="bg-[#232334] text-white p-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {mesesNomes.map((nome, idx) => (<option key={idx} value={idx}>{nome}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Ano</label>
              <select value={ano} onChange={e => setAno(Number(e.target.value))} className="bg-[#232334] text-white p-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {anosDisponiveis.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-200">{mesesNomes[mes]}/{ano}</div>
            <div className="text-2xl font-bold text-green-400">{formatBRL(totalGeral)}</div>
          </div>
      </header>
      <main> 
        {categorias.map(({ key, titulo, icon, cor, campoValor, campoNome }) => {
          const items: ParcelaDoc[] = dados[key] || [];
          if (!items.length) return null;

          const totalNum = key === 'cartoes' 
            ? items.reduce((sum: number, c: any) => sum + (c.gastos || []).reduce((s: number, g: any) => s + (g.valor || 0), 0), 0) 
            : items.reduce((sum, i) => sum + (i[campoValor!] || i.valor || 0), 0); // Adicionado fallback para i.valor

          return (
            <CategoriaToggle key={key} icon={icon} titulo={titulo} total={formatBRL(totalNum)} corFundo={cor}>
              {items.map((i: ParcelaDoc, index: number) => { 
                if (key === 'cartoes') { 
                  return <CartaoBox key={i.cartaoId || i.id || index} i={i} setModalGasto={setModalGasto} />;
                }
                
                let itemDisplayTextContainer;
                const valorOriginal = i[campoValor!] !== undefined ? i[campoValor!] : (i.valor !== undefined ? i.valor : 0);
                const isParcelaItem = campoValor === 'valorParcela';

                if (key === 'boletos' || key === 'pix') {
                    itemDisplayTextContainer = (
                        <div className="flex items-baseline flex-wrap">
                            {i.beneficiario && <span className="font-semibold text-sm">{i.beneficiario}</span>}
                            {i.descricao && <span className={`ml-2 text-xs text-gray-400 ${!i.beneficiario ? 'font-semibold text-sm' : ''}`}>{i.descricao}</span>}
                            {i.parcela && i.parcelasTotais && <span className="ml-2 text-xs text-gray-400">{`${i.parcela}/${i.parcelasTotais}`}</span>}
                        </div>
                    );
                } else if (key === 'financiamentos') {
                    itemDisplayTextContainer = (
                        <div className="flex items-baseline flex-wrap">
                            {i.financiamento && <span className="font-semibold text-sm">{i.financiamento}</span>}
                            {i.descricao && <span className={`ml-2 text-xs text-gray-400 ${!i.financiamento ? 'font-semibold text-sm' : ''}`}>{i.descricao}</span>}
                            {i.parcela && i.parcelasTotais && <span className="ml-2 text-xs text-gray-400">{`${i.parcela}/${i.parcelasTotais}`}</span>}
                        </div>
                    );
                } else if (key === 'emprestimos') {
                    itemDisplayTextContainer = (
                        <div className="flex items-baseline flex-wrap">
                            {i.banco && <span className="font-semibold text-sm">{i.banco}</span>}
                            {i.descricao && <span className="ml-2 text-xs text-gray-400">{i.descricao}</span>}
                            {i.parcela && i.parcelasTotais && <span className="ml-2 text-xs text-gray-400">{`${i.parcela}/${i.parcelasTotais}`}</span>}
                        </div>
                    );
                } else if (key === 'gastos') {
                    itemDisplayTextContainer = (
                        <div className="flex items-baseline flex-wrap">
                            {i.categoria && <span className="font-semibold text-sm">{i.categoria}</span>}
                            {i.descricao && <span className="ml-2 text-xs text-gray-400">{i.descricao}</span>}
                        </div>
                    );
                } else if (key === 'assinaturas') {
                     const nomePrincipalAssinatura = i.servico || i.descricao;
                     return (
                        <div key={i.id || index} className="flex justify-between items-start text-sm py-2 border-b border-gray-700 last:border-b-0">
                          <div className="flex flex-col items-start flex-grow mr-2">
                            <div className="flex items-baseline flex-wrap">
                                {nomePrincipalAssinatura && <span className="font-semibold text-sm truncate">{nomePrincipalAssinatura}</span>}
                                {/* {i.descricao && i.descricao !== nomePrincipalAssinatura && <span className="ml-2 text-xs text-gray-400">{i.descricao}</span>} */}
                            </div>
                            {i.origem === 'cartao' && <span className="mt-1 px-2 py-0.5 rounded bg-pink-600 text-white text-xs flex items-center gap-1"><FaRegCreditCard /> {i.cartao}</span>}
                            {i.recorrente === true && <button onClick={() => requestCancel(i.id!, i.cartaoId)} className="mt-1 text-yellow-300 text-xs hover:underline">Cancelar Assinatura</button>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold">{formatBRL(valorOriginal)}</span>
                            <button onClick={() => setModalGasto({ gasto: i, cartao: i.cartaoId ? { cartaoId: i.cartaoId, banco: i.cartao || '' } : undefined, key: key, tempDescricao: String(nomePrincipalAssinatura || ''), tempValor: String(valorOriginal || 0), isParcela: isParcelaItem, confirmExcluir: false })} className="text-blue-400" title="Gerenciar lançamento"><FaCog /></button>
                          </div>
                        </div>
                      );
                }
                 else { 
                    const defaultDescricaoItem = i[campoNome!] || i.descricao;
                    itemDisplayTextContainer = (
                        <div className="flex items-baseline flex-wrap">
                            {defaultDescricaoItem && <span className="font-semibold text-sm">{defaultDescricaoItem}</span>}
                            {i.parcela && i.parcelasTotais && <span className="ml-2 text-xs text-gray-400">{`${i.parcela}/${i.parcelasTotais}`}</span>}
                        </div>
                    );
                }

                return (
                  <div key={i.id || index} className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-b-0">
                    <span className="flex-grow truncate mr-2">
                        {itemDisplayTextContainer}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span>{formatBRL(valorOriginal || 0)}</span>
                      <button 
                        onClick={() => {
                            let descParaModal = i.descricao; 
                            if (key === 'boletos' || key === 'pix' || key === 'financiamentos' || key === 'emprestimos' || key === 'gastos') {
                                descParaModal = i.descricao;
                            } else if (key === 'assinaturas') {
                                descParaModal = i.servico || i.descricao;
                            } else if (!descParaModal) { 
                                descParaModal = i[campoNome!];
                            }
                            setModalGasto({
                                gasto: i,
                                cartao: undefined, 
                                key: key,
                                tempDescricao: String(descParaModal || ''),
                                tempValor: String(valorOriginal || 0),   
                                isParcela: isParcelaItem,
                                confirmExcluir: false,
                            })
                        }} 
                        className="text-blue-400" 
                        title="Gerenciar lançamento"
                      ><FaCog /></button>
                    </div>
                  </div>
                );
              })}
            </CategoriaToggle>
          );
        })}
      </main>
    </div>
  );
}