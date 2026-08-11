import DealsKanban from '../components/deals/DealsKanban'
import RotateDevicePrompt from '../components/ui/RotateDevicePrompt'

export default function DealsKanbanPage() {
  return (
    <>
      <RotateDevicePrompt />
      <div className="h-[calc(100vh-64px)]">
        <DealsKanban />
      </div>
    </>
  )
}
