'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { importProducts } from '@/lib/actions/import'
import { IDLE } from '@/lib/types'

const TEMPLATE =
  'title,category_slug,description,brand,price,currency,moq,unit,stock_quantity\n' +
  'Karton Kutu 40x60x40,karton-kutu,Çift oluklu mukavva,NOVA,55,TRY,100,adet,10000\n'

/**
 * Dosya tarayıcıda okunur, metin olarak gönderilir. Böylece kullanıcı
 * içe aktarmadan ÖNCE ne yükleyeceğini görür — 500 satırlık bir hatayı
 * sonradan temizlemek zordur.
 */
export function ImportForm({ companyId }: { companyId: string }) {
  const t = useTranslations('import')
  const [state, action] = useActionState(importProducts, IDLE)
  const [csv, setCsv] = useState('')
  const [filename, setFilename] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const rows = csv.trim() ? csv.trim().split(/\r?\n/) : []
  const header = rows[0]?.split(',') ?? []
  const body = rows.slice(1, 6)

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'supsto-urun-sablonu.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="csv" value={csv} />
      <input type="hidden" name="filename" value={filename} />

      <Notice tone="neutral">
        <b className="mb-1 block">{t('columns')}</b>
        <code className="text-[11px]">{t('columnsHint')}</code>
      </Notice>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => inputRef.current?.click()}>
          {t('selectFile')}
        </Button>
        <Button type="button" variant="quiet" onClick={downloadTemplate}>
          {t('downloadTemplate')}
        </Button>
        {filename ? <span className="self-center text-xs text-muted">{filename}</span> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setFilename(file.name)
          setCsv(await file.text())
          e.target.value = ''
        }}
      />

      {rows.length > 1 ? (
        <>
          <div>
            <h2 className="mb-2 text-sm font-bold">
              {t('preview')} · {t('rowsFound', { count: rows.length - 1 })}
            </h2>
            <TableWrap className="rounded-card border border-line">
              <Table>
                <thead>
                  <tr>{header.map((h) => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {body.map((line, i) => (
                    <tr key={i}>
                      {line.split(',').map((cell, j) => (
                        <Td key={j} className="border-b-0 max-w-40 truncate">{cell}</Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </div>

          <Notice tone="warning">{t('draftNotice')}</Notice>

          <SubmitButton pendingLabel={t('importing')}>{t('runImport')}</SubmitButton>
        </>
      ) : null}
    </form>
  )
}
