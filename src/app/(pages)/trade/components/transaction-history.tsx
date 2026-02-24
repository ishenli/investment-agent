'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Badge } from '@renderer/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { SearchIcon, FilterIcon, PlusIcon, EditIcon } from 'lucide-react';
import { useAssetStore } from '@renderer/store/asset/store';
import dayjs from 'dayjs';
import { AddTransactionDialog } from '../../../components/add-transaction-dialog';
import { EditTransactionDialog } from '../../../components/edit-transaction-dialog';
import { TransactionRecordType } from '@/types';
import { useTranslation } from 'react-i18next';

export function TransactionHistory() {
  const { t } = useTranslation('transaction');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecordType | null>(
    null,
  );
  const fetchTransactions = useAssetStore((state) => state.fetchTransactions);

  // Get transactions from store
  const { transactions, transactionsLoading, transactionsError } = useAssetStore();

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.referenceId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle loading state
  if (transactionsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('history.title')}</CardTitle>
            <CardDescription>{t('history.loading')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (transactionsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('history.title')}</CardTitle>
            <CardDescription>{t('history.error')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-red-500 text-center py-4">{t('error', { ns: 'common' })}: {transactionsError}</div>
            <div className="text-center">
              <Button onClick={() => fetchTransactions()}>{t('history.reload')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('history.searchPlaceholder')}
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-40">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={t('history.filter.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('history.filter.all')}</SelectItem>
                    <SelectItem value="deposit">{t('history.filter.deposit')}</SelectItem>
                    <SelectItem value="withdrawal">{t('history.filter.withdrawal')}</SelectItem>
                    <SelectItem value="buy">{t('history.filter.buy')}</SelectItem>
                    <SelectItem value="sell">{t('history.filter.sell')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Button size="sm" onClick={() => setIsAddTransactionOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    {t('history.addButton')}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('history.noRecords')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('history.table.time')}</TableHead>
                    <TableHead>{t('history.table.type')}</TableHead>
                    <TableHead>{t('history.table.market')}</TableHead>
                    <TableHead>{t('history.table.symbol')}</TableHead>
                    <TableHead>{t('history.table.quantity')}</TableHead>
                    <TableHead>{t('history.table.price')}</TableHead>
                    <TableHead>{t('history.table.amount')}</TableHead>
                    <TableHead>{t('history.table.description')}</TableHead>
                    <TableHead>{t('history.table.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {dayjs(transaction.tradeTime || transaction.createdAt).format(
                          'YYYY-MM-DD HH:mm',
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            transaction.type === 'deposit'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : transaction.type === 'withdrawal'
                                ? 'bg-red-100 text-red-800 hover:bg-red-100'
                                : transaction.type === 'buy'
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                  : transaction.type === 'sell'
                                    ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                                    : ''
                          }
                        >
                          {transaction.type === 'deposit' && t('history.filter.deposit')}
                          {transaction.type === 'withdrawal' && t('history.filter.withdrawal')}
                          {transaction.type === 'buy' && t('history.filter.buy')}
                          {transaction.type === 'sell' && t('history.filter.sell')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            transaction.market === 'US'
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                              : transaction.market === 'HK'
                                ? 'bg-red-100 text-red-800 hover:bg-red-100'
                                : transaction.market === 'CN'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                        >
                          {transaction.market === 'US' && t('history.market.US')}
                          {transaction.market === 'HK' && t('history.market.HK')}
                          {transaction.market === 'CN' && t('history.market.CN')}
                          {!transaction.market && '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.symbol}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>{transaction.price}</TableCell>

                      <TableCell
                        className={
                          transaction.type === 'deposit' || transaction.type === 'sell'
                            ? 'text-green-500'
                            : 'text-red-500'
                        }
                      >
                        {transaction.type === 'deposit' || transaction.type === 'sell' ? '+' : '-'}
                        {transaction.amount}
                      </TableCell>
                      <TableCell>{transaction.description || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setIsEditTransactionOpen(true);
                          }}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Add Transaction Dialog */}
      <AddTransactionDialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen} />
      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        open={isEditTransactionOpen}
        onOpenChange={setIsEditTransactionOpen}
        transaction={selectedTransaction}
      />
    </>
  );
}
