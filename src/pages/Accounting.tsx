import { useState, useEffect } from 'react';
import { useGlobalRentals, useGlobalProducts } from '../data/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Euro, TrendingUp, Filter, Printer, Truck } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';

export default function Accounting() {
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalTransport, setTotalTransport] = useState(0);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 7) + '-01');
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().substring(0, 10));
    const [filteredRentals, setFilteredRentals] = useState<any[]>([]);

    const { rentals } = useGlobalRentals();
    const { products } = useGlobalProducts();

    function fetchReports() {
        setLoading(true);

        // 1. Filtro dos Alugueres pela Data
        let filteredData = rentals;
        if (startDate) {
            filteredData = filteredData.filter(r => new Date(r.pickup_date) >= new Date(startDate));
        }
        if (endDate) {
            filteredData = filteredData.filter(r => new Date(r.pickup_date) <= new Date(endDate));
        }
        setFilteredRentals(filteredData);

        // 2. Faturamento (Exclui a Caução e Transporte) - Agora focado apenas em Materiais
        const materialsRevenue = filteredData
            .filter(r => r.payment_status === 'paid')
            .reduce((acc, curr) => acc + (curr.materials_value || 0), 0);
        setTotalRevenue(materialsRevenue);

        // 2.1 Transporte 
        const transportTotal = filteredData
            .filter(r => r.payment_status === 'paid')
            .reduce((acc, curr) => acc + Number(curr.transport_value || 0), 0);
        setTotalTransport(transportTotal);

        // 3. Produtos Mais Alugados (Top 5)
        const productStats: Record<string, number> = {};
        let totalItemsRented = 0;

        filteredData.forEach(rental => {
            if (rental.items && rental.items.length > 0) {
                rental.items.forEach(item => {
                    if (!productStats[item.product_id]) productStats[item.product_id] = 0;
                    productStats[item.product_id] += item.quantity;
                    totalItemsRented += item.quantity;
                });
            }
        });

        const ranked = products
            .map(p => ({
                name: p.name,
                rented_quantity: productStats[p.id] || 0,
                percentage: totalItemsRented > 0 ? ((productStats[p.id] || 0) / totalItemsRented) * 100 : 0
            }))
            .filter(p => p.rented_quantity > 0)
            .sort((a, b) => b.rented_quantity - a.rented_quantity)
            .slice(0, 5); // top 5

        setTopProducts(ranked);
        setLoading(false);
        console.log('DADOS DO EXTRATO:', filteredData); // Log solicitado pelo utilizador
    }

    // Recalcula relatorios quando as dependencias (DB) ou data mudam (inicializacao)
    useEffect(() => {
        fetchReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rentals, products]);



    return (
        <div className="space-y-6">
            {/* Cabeçalho Apenas Impressão */}
            <div className="hidden print:block mb-8 text-black">
                <h1 className="text-3xl font-bold mb-2">Relatório de Faturamento - Tourozero</h1>
                <p className="text-sm">Período: {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} até {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'}</p>
                <p className="text-sm">Gerado em: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>

            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-bold tracking-tight">Contabilidade e Relatórios</h1>
                <Button onClick={() => window.print()} className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 border-none print:hidden">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Relatório
                </Button>
            </div>

            <div className="flex flex-col md:flex-row items-end gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg print:hidden">
                <div className="w-full md:w-auto">
                    <label className="block text-xs text-slate-400 mb-1">Data Inicial</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="w-full md:w-auto">
                    <label className="block text-xs text-slate-400 mb-1">Data Final</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button onClick={fetchReports} className="w-full md:w-auto mt-2 md:mt-0 font-bold bg-amber-500 hover:bg-amber-600 text-slate-900">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar Relatório
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3 print:hidden">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium text-slate-300">Faturado (Materiais)</CardTitle>
                        <Euro className="h-6 w-6 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-xl text-slate-500 animate-pulse">Calculando...</div>
                        ) : (
                            <>
                                <div className="text-4xl font-bold text-emerald-400">{totalRevenue.toFixed(2)} €</div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Valor base para cálculo de comissões. (Exclui transporte e caução)
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 border-b-amber-500/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium text-slate-300">Serviços de Transporte</CardTitle>
                        <Truck className="h-6 w-6 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-xl text-slate-500 animate-pulse">Calculando...</div>
                        ) : (
                            <>
                                <div className="text-4xl font-bold text-amber-500">{totalTransport.toFixed(2)} €</div>
                                <p className="text-sm text-slate-400 mt-2">
                                    No período selecionado {startDate || endDate ? '(Filtrado)' : '(Todo período)'}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium text-slate-300">Produtos Mais Alugados (Top 5)</CardTitle>
                        <TrendingUp className="h-6 w-6 text-amber-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        {loading ? (
                            <div className="text-sm text-slate-500 animate-pulse">Analisando dados...</div>
                        ) : topProducts.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhum dado de aluguer suficiente registrado.</p>
                        ) : (
                            <div className="space-y-4">
                                {topProducts.map((prod, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="space-y-1 w-full mr-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium text-slate-200">{idx + 1}. {prod.name}</span>
                                                <span className="text-slate-400">{prod.percentage.toFixed(1)}%</span>
                                            </div>
                                            {/* Barra de progresso visual */}
                                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full"
                                                    style={{ width: `${prod.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-amber-500 shrink-0">
                                            {prod.rented_quantity} <span className="text-xs font-normal text-slate-400">un.</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Secção Divisão de Parceria */}
            <div className="grid gap-6 md:grid-cols-2 print:hidden mt-6">
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium text-slate-300">Parte do Proprietário (80%)</CardTitle>
                        <Euro className="h-6 w-6 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-xl text-slate-500 animate-pulse">Calculando...</div>
                        ) : (
                            <div className="text-3xl font-bold text-emerald-500">{(totalRevenue * 0.8).toFixed(2)} €</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium text-slate-300">Comissão Maywan (20%)</CardTitle>
                        <TrendingUp className="h-6 w-6 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-xl text-slate-500 animate-pulse">Calculando...</div>
                        ) : (
                            <div className="text-3xl font-bold text-blue-500">{(totalRevenue * 0.2).toFixed(2)} €</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Relatório */}
            <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden print:border-none print:mt-4 print:bg-white print:text-black">
                <div className="p-4 border-b border-slate-800 print:hidden">
                    <h2 className="text-lg font-medium text-slate-300">Extrato de Faturamento</h2>
                </div>
                <Table>
                    <TableHeader className="print:text-black">
                        <TableRow className="print:border-b-2 print:border-black">
                            <TableHead className="print:text-black">Data do Aluguer</TableHead>
                            <TableHead className="print:text-black">Nome do Cliente</TableHead>
                            <TableHead className="print:text-black">Produtos</TableHead>
                            <TableHead className="text-right print:text-black">Materiais (€)</TableHead>
                            <TableHead className="text-right print:text-black">Transporte (€)</TableHead>
                            <TableHead className="text-right print:text-black">Prop. (80%)</TableHead>
                            <TableHead className="text-right print:text-black text-blue-400">Comissão (20%)</TableHead>
                            <TableHead className="text-right print:text-black">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRentals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-400 print:text-black">Nenhum registo encontrado no período selecionado.</TableCell>
                            </TableRow>
                        ) : (
                            filteredRentals.map(r => (
                                <TableRow key={r.id} className="print:border-b print:border-slate-200">
                                    <TableCell className="print:text-black">{new Date(r.pickup_date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="print:text-black font-medium">{r.customers?.full_name || 'Desconhecido'}</TableCell>
                                    <TableCell className="print:text-black max-w-[200px]">
                                        <div className="flex flex-wrap gap-1">
                                            {r.items && r.items.length > 0 ? (
                                                r.items.map((it: any, idx: number) => (
                                                    <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                                                        {it.quantity}x {it.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-slate-500 italic">TESTE</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold print:text-black text-emerald-400">{(r.materials_value || 0).toFixed(2)} €</TableCell>
                                    <TableCell className="text-right font-bold print:text-black text-amber-500">{(Number(r.transport_value || 0)).toFixed(2)} €</TableCell>
                                    <TableCell className="text-right font-medium print:text-black text-emerald-500">
                                        {((r.materials_value || 0) * 0.8).toFixed(2)} €
                                    </TableCell>
                                    <TableCell className="text-right font-bold print:text-black text-blue-500">
                                        {((r.materials_value || 0) * 0.2).toFixed(2)} €
                                    </TableCell>
                                    <TableCell className="text-right print:text-black">
                                        <span className={`text-xs px-2 py-1 rounded-full inline-block ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 print:border print:border-emerald-500' : 'bg-slate-500/10 text-slate-500 print:border print:border-slate-500'}`}>
                                            {r.status === 'active' ? 'Ativo' : (r.status === 'completed' ? 'Finalizado' : 'Cancelado')}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {/* Rodapé Dinâmico */}
                        <TableRow className="bg-slate-900/80 hover:bg-slate-900/80 print:bg-white print:border-t-2 print:border-black font-bold text-base">
                            <TableCell colSpan={3} className="text-right text-slate-300 print:text-black uppercase tracking-wider py-4">
                                Soma Total do Período
                            </TableCell>
                            <TableCell className="text-right text-emerald-400 print:text-black py-4">
                                {totalRevenue.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right text-amber-500 print:text-black py-4">
                                {totalTransport.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right text-emerald-500 print:text-black py-4">
                                {(totalRevenue * 0.8).toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right text-blue-500 print:text-black py-4">
                                {(totalRevenue * 0.2).toFixed(2)} €
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
