import { LocalSbomService } from '@/services/sbomStorageService/localSbomService'
import { vol } from 'memfs'

// Mock 'fs' before importing the service
jest.mock('fs', () => require('memfs').fs)

import path from 'path'



// Use a fake root directory
const tempDir = '/testData'
const service = new LocalSbomService(tempDir, 2)

// Helper to reset virtual filesystem
beforeEach(() => {
  vol.reset()
})

test('listFiles returns correct files for a container', async () => {
  const container = 'app1'
  const containerPath = path.join(tempDir, container)
  vol.mkdirSync(containerPath, { recursive: true })
  vol.writeFileSync(path.join(containerPath, 'a.json'), '{}')
  vol.writeFileSync(path.join(containerPath, 'b.json'), '{}')

  const files = await service.listFiles(container)
  expect(files).toHaveLength(2)
  const names = files.map(f => f.name).sort()
  expect(names).toEqual(['a.json', 'b.json'])
})

test('listSboms paginates containers correctly', async () => {
  // Create 3 containers
  for (let i = 1; i <= 3; i++) {
    const dir = path.join(tempDir, `c${i}`)
    vol.mkdirSync(dir, { recursive: true })
    vol.writeFileSync(path.join(dir, 'file.json'), '{}')
  }

  const resPage1 = await service.listSboms(1)
  expect(resPage1.pagination.totalPages).toBe(2)
  expect(resPage1.containers.map(c => c.name)).toEqual(['c1', 'c2'])

  const resPage2 = await service.listSboms(2)
  expect(resPage2.containers).toHaveLength(1)
  expect(resPage2.containers[0].name).toBe('c3')
})

test('getFileContent reads file content', async () => {
  const container = 'app2'
  const fileName = 'data.json'
  const content = '{"key":"value"}'
  const dir = path.join(tempDir, container)
  vol.mkdirSync(dir, { recursive: true })
  vol.writeFileSync(path.join(dir, fileName), content)

  const result = await service.getFileContent(container, fileName)
  expect(result).toBe(content)
})

test('saveFile writes content correctly', async () => {
  const fileName = 'saveTest.json'
  const content = '{"save":"ok"}'

  await service.saveFile(fileName, content)

  const stored = vol.readFileSync(path.join(tempDir, fileName), 'utf8')
  expect(stored).toBe(content)
})
