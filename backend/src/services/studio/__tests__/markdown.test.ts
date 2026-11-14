import { describe, it, expect } from 'vitest'
import { cleanMarkdown } from '../markdown'

describe('cleanMarkdown', () => {
  it('normalizes LaTeX delimiters', () => {
    const out = cleanMarkdown('قيمة \\(x+1\\) ثم \\[y=2\\]')
    expect(out).toContain('$x+1$')
    expect(out).toContain('$$\ny=2\n$$')
    expect(out).not.toMatch(/\\[()[\]]/)
  })

  it('drops conditional suffixes from headings', () => {
    expect(cleanMarkdown('### 5. جدول قيم أو ملخص (إن وجد)')).toBe('### 5. جدول قيم أو ملخص')
    expect(cleanMarkdown('### 6. التمثيل الهندسي (إن وجدت)')).toBe('### 6. التمثيل الهندسي')
  })

  it('removes URLs from the source line only', () => {
    const out = cleanMarkdown('> **المصدر:** درس – www.example.com\n\nنص www.example.com')
    const sourceLine = out.split('\n')[0]
    expect(sourceLine).toContain('> **المصدر:** درس –')
    expect(sourceLine).not.toContain('www.example.com')
    expect(out).toContain('نص www.example.com')
  })

  it('fixes common Arabic and English artifacts', () => {
    const out = cleanMarkdown(
      '> **المصدر:** document (1).pdf\n\n' +
        'المستهددة ونص التتمرن. إذا و فقط. monotone interval function increasing decreasing. ' +
        'متصاعدة. finite. نصفين من المماس. على المجال المفتوح لتعريفها. ' +
        'ماذا نستنتج عن monotonicité الدالة؟ وما monotonicity الفترة؟',
    )
    expect(out).toContain('> **المصدر:** وثيقة (1)')
    expect(out).toContain('المستهدفة ونص التمرين')
    expect(out).toContain('إذا وفقط')
    expect(out).toContain('رتيبة فترة دالة متزايدة متناقصة')
    expect(out).toContain('متزايدة')
    expect(out).toContain('منتهٍ')
    expect(out).toContain('نصفَي مماس')
    expect(out).toContain('على مجال تعريفها')
    expect(out).toContain('ماذا نستنتج عن رتابة الدالة؟')
    expect(out).not.toMatch(/monotonicit|monotonie/i)
  })

  it('strips a wrapping markdown fence', () => {
    expect(cleanMarkdown('```markdown\n# عنوان\n```')).toBe('# عنوان')
  })
})
