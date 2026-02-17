import { describe, it, expect } from 'vitest'
import { CERTIFICATIONS, EXAM_TYPES } from '../certifications'

describe('CERTIFICATIONS', () => {
  it('すべての ExamType に対してエントリが存在する', () => {
    for (const type of EXAM_TYPES) {
      expect(CERTIFICATIONS[type]).toBeDefined()
    }
  })

  it('各資格に必須フィールドが存在する', () => {
    for (const cert of Object.values(CERTIFICATIONS)) {
      expect(cert.id).toBeTruthy()
      expect(cert.name).toBeTruthy()
      expect(cert.shortName).toBeTruthy()
      expect(cert.description).toBeTruthy()
      expect(cert.provider).toBeTruthy()
      expect(cert.url).toBeTruthy()
    }
  })

  it('FE の情報が正しい', () => {
    expect(CERTIFICATIONS.fe.name).toBe('基本情報技術者試験')
    expect(CERTIFICATIONS.fe.shortName).toBe('FE')
    expect(CERTIFICATIONS.fe.provider).toBe('IPA（情報処理推進機構）')
  })

  it('AP の情報が正しい', () => {
    expect(CERTIFICATIONS.ap.name).toBe('応用情報技術者試験')
    expect(CERTIFICATIONS.ap.shortName).toBe('AP')
  })

  it('AWS SAA の情報が正しい', () => {
    expect(CERTIFICATIONS['aws-saa'].shortName).toBe('AWS SAA')
    expect(CERTIFICATIONS['aws-saa'].provider).toBe('Amazon Web Services')
  })

  it('EXAM_TYPES の数と CERTIFICATIONS のエントリ数が一致する', () => {
    expect(Object.keys(CERTIFICATIONS)).toHaveLength(EXAM_TYPES.length)
  })
})
