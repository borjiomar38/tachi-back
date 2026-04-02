import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group';

type TextareaProps = Pick<
  React.ComponentProps<'textarea'>,
  | 'className'
  | 'placeholder'
  | 'id'
  | 'name'
  | 'value'
  | 'defaultValue'
  | 'disabled'
  | 'readOnly'
  | 'required'
  | 'aria-invalid'
  | 'aria-describedby'
  | 'autoFocus'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'onBlur'
  | 'onChange'
  | 'onKeyDown'
  | 'inputMode'
  | 'rows'
  | 'cols'
> &
  Pick<React.ComponentProps<typeof InputGroup>, 'size'> & {
    ref?: React.Ref<HTMLTextAreaElement>;
  };

function Textarea({ ref, size, className, ...props }: TextareaProps) {
  return (
    <InputGroup size={size} className={className}>
      <InputGroupTextarea {...props} ref={ref} data-slot="input" />
    </InputGroup>
  );
}

export { Textarea };
