export const handleSimpleInputChange = (setFormData) => (event) => {
  const { name, value } = event.target;
  setFormData(prevData => ({ ...prevData, [name]: value }));
};

export const handleNestedInputChange = (setFormData) => (event) => {
  const { name, value } = event.target;
  const [category, subCategory] = name.split('.');
  setFormData(prevData => ({
    ...prevData,
    [category]: {
      ...prevData[category],
      [subCategory]: value
    }
  }));
};
