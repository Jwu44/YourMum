import React from 'react'
import { SelectMenu, Button } from 'evergreen-ui'

const PlannerMenu = ({ plannerType }) => {
  const [selected, setSelected] = React.useState(null)

  return (
    <SelectMenu
      title="Planner preferences"
      options={plannerType.map((label) => ({ label, value: label }))}
      hasFilter={false}
      hasTitle={false}
      selected={selected}
      onSelect={(item) => setSelected(item.value)}
    >
      <Button>{selected || 'Planner preferences'}</Button>
    </SelectMenu>
  )
}

export default PlannerMenu;