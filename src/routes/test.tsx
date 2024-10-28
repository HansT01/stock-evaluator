import { testCache } from '~/server/exchange-rate'

const TestPage = () => {
  const handleClick = async () => {
    const result = await testCache()
    console.log(result)
  }

  return (
    <div class='fixed inset-0 flex items-center justify-center bg-background text-background-fg'>
      <button onClick={handleClick} class='rounded-lg border-none bg-primary px-4 py-2 text-primary-fg'>
        PRESS ME
      </button>
    </div>
  )
}

export default TestPage
