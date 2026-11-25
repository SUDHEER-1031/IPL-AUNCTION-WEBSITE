import type { RoomStatePayload } from '../types/auction';
import { formatLakhs } from './format';

export function exportAuctionCsv(state: RoomStatePayload): void {
  const headers = [
    'Set',
    'Set Name',
    'Player Name',
    'Role',
    'Nationality',
    'Category',
    'Base Price',
    'Status',
    'Sold To Team',
    'Final Price',
  ];

  const rows = state.allRoomPlayers.map((rp) => [
    String(rp.setNumber),
    rp.setName,
    rp.player.name,
    rp.player.role,
    rp.player.nationality,
    rp.player.isOverseas ? 'Overseas' : 'Indian',
    formatLakhs(rp.player.basePriceLakhs),
    rp.status,
    rp.soldToTeamId ?? '-',
    rp.soldPriceLakhs !== null ? formatLakhs(rp.soldPriceLakhs) : '-',
  ]);

  const escapeCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `IPL_Auction_${state.code}_Results.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAuctionPdf(): void {
  window.print();
}
