import { useId } from 'react';

export default function SelectDigitavel({ value, onChange, opcoes, placeholder, style }) {
  const id = useId();
  return (
    <>
      <input
        type="text"
        list={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
      />
      <datalist id={id}>
        {opcoes.map(o => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}
