'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Loader2, Upload, Info } from 'lucide-react'
import { InfoDropdown } from '@/components/ui/info-dropdown'

export function ImportSymbolsDialog() {
  const [open, setOpen] = useState(false)
  const [symbolsText, setSymbolsText] = useState('')
  const [symbolType, setSymbolType] = useState<string>('stock')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const importMutation = useMutation({
    mutationFn: async (symbols: string[]) => {
      const response = await fetch('/api/markets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols,
          type: symbolType,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import symbols')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['market-symbols'] })
      toast({
        title: 'Símbolos importados',
        description: `Importados ${data.results.imported} símbolos. ${data.results.skipped > 0 ? `${data.results.skipped} omitidos (ya existían).` : ''}`,
      })
      setOpen(false)
      setSymbolsText('')
    },
    onError: (error) => {
      toast({
        title: 'Error en importación',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    },
  })

  const handleImport = () => {
    const symbols = symbolsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.toUpperCase())

    if (symbols.length === 0) {
      toast({
        title: 'Sin símbolos',
        description: 'Ingresa al menos un símbolo',
        variant: 'destructive',
      })
      return
    }

    importMutation.mutate(symbols)
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Importar símbolos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">Importar símbolos de mercado</DialogTitle>
            <DialogDescription>
              Ingresa los símbolos uno por línea. Se buscarán automáticamente en Finnhub y se
              importarán con su información básica (nombre, sector, país, tipo).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="symbol-type">Tipo de activo</Label>
              <Select value={symbolType} onValueChange={setSymbolType}>
                <SelectTrigger id="symbol-type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Acciones</SelectItem>
                  <SelectItem value="index">Índices</SelectItem>
                  <SelectItem value="forex">Divisas</SelectItem>
                  <SelectItem value="commodity">Materias primas</SelectItem>
                  <SelectItem value="crypto">Cripto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="symbols">Símbolos (uno por línea)</Label>
              <Textarea
                id="symbols"
                placeholder="AAPL&#10;MSFT&#10;GOOGL&#10;TSLA&#10;..."
                value={symbolsText}
                onChange={(e) => setSymbolsText(e.target.value)}
                className="mt-2 font-mono text-sm min-h-[200px]"
              />
              <p className="text-xs text-intel-muted mt-2">
                Ejemplos: AAPL, MSFT, GOOGL, TSLA, BTC-USD, EURUSD, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InfoDropdown
        title="Importar símbolos"
        content={
          <>
            <p className="mb-2">
              Importa <strong>múltiples símbolos</strong> desde Finnhub de una vez.
            </p>
            <p className="mb-2">
              <strong>Formato:</strong> Un símbolo por línea (ej: AAPL, MSFT, BTC-USD)
            </p>
            <p className="mb-2">
              <strong>El sistema:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Busca automáticamente cada símbolo en Finnhub</li>
              <li>Obtiene información básica (nombre, sector, país, etc.)</li>
              <li>Los duplicados se omiten automáticamente</li>
              <li>Los símbolos quedan activos y listos para monitorear</li>
            </ul>
            <p className="text-xs mt-2 text-intel-muted/70">
              Nota: Ya hay más de 150 símbolos importantes pre-configurados en la base de datos.
            </p>
          </>
        }
        side="bottom"
      />
    </div>
  )
}

