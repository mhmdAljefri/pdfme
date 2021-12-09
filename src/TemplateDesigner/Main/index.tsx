import { useRef, useState, useEffect } from 'react';
import Selecto from 'react-selecto';
import Moveable, { OnDrag, OnResize } from 'react-moveable';
import * as styles from './index.module.scss';
import { GuidesInterface, Schema as SchemaType, PageSize } from '../../libs/type';
import { round, flatten, getFontFamily } from '../../libs/utils';
import { zoom, rulerHeight } from '../../libs/constants';
import Paper from '../../components/Paper';
import Schema from '../../components/Schemas';
import Guides from '../Guides';
import { getSelectoOpt, getMoveableOpt } from './options';

const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => String(round(fmt4Num(prop) / zoom, 2));

const Mask = ({ width, height }: PageSize) => (
  <div className={styles.mask} style={{ width, height }} />
);
interface Props {
  pageCursor: number;
  scale: number;
  backgrounds: string[];
  pageSizes: PageSize[];
  activeElements: HTMLElement[];
  schemas: { [key: string]: SchemaType }[];
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  setActiveElements: (targets: HTMLElement[]) => void;
  focusElementId: string;
  changeSchemas: (objs: { key: string; value: string; schemaId: string }[]) => void;
}

const Main = ({
  pageCursor,
  scale,
  backgrounds,
  pageSizes,
  activeElements,
  schemas,
  setActiveElements,
  onMouseEnter,
  onMouseLeave,
  focusElementId,
  changeSchemas,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const verticalGuides = useRef<GuidesInterface[]>([]);
  const horizontalGuides = useRef<GuidesInterface[]>([]);
  const moveable = useRef<any>(null);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.shiftKey) setIsPressShiftKey(true);
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift') setIsPressShiftKey(false);
  };

  const [isPressShiftKey, setIsPressShiftKey] = useState(false);
  const [editing, setEditing] = useState(false);

  const initEvents = () => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('keyup', onKeyup);
  };

  const destroyEvents = () => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  };

  useEffect(() => {
    initEvents();
    return destroyEvents;
  }, []);

  const onDrag = ({ target, left, top }: OnDrag) => {
    if (!target) return;
    target.style.left = (left < 0 ? 0 : left) + 'px';
    target.style.top = (top < 0 ? 0 : top) + 'px';
  };

  const onResize = ({ target, width, height, direction }: OnResize) => {
    if (!target) return;
    const s = target!.style;
    const newLeft = Number(fmt4Num(s.left)) + (Number(fmt4Num(s.width)) - width);
    const newTop = Number(fmt4Num(s.top)) + (Number(fmt4Num(s.height)) - height);
    const obj: any = { width: `${width}px`, height: `${height}px` };
    const d = direction.toString();
    if (d === '-1,-1' || d === '-1,0' || d === '0,-1') {
      obj.top = `${newTop}px`;
      obj.left = `${newLeft}px`;
    } else if (d === '1,-1') {
      obj.top = `${newTop}px`;
    } else if (d === '-1,1') {
      obj.left = `${newLeft}px`;
    }
    Object.assign(s, obj);
  };

  const onDragEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { top, left } = target.style;
    changeSchemas([
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { width, height, top, left } = target.style;
    changeSchemas([
      { key: 'width', value: fmt(width), schemaId: target.id },
      { key: 'height', value: fmt(height), schemaId: target.id },
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onDragEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map((target) => {
      const { top, left } = target.style;
      return [
        { key: 'position.y', value: fmt(top), schemaId: target.id },
        { key: 'position.x', value: fmt(left), schemaId: target.id },
      ];
    });
    changeSchemas(flatten(arg));
  };

  const onResizeEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map((target) => {
      const { width, height, top, left } = target.style;
      return [
        { key: 'width', value: fmt(width), schemaId: target.id },
        { key: 'height', value: fmt(height), schemaId: target.id },
        { key: 'position.y', value: fmt(top), schemaId: target.id },
        { key: 'position.x', value: fmt(left), schemaId: target.id },
      ];
    });
    changeSchemas(flatten(arg));
  };

  const getGuideLines = (guides: GuidesInterface[], index: number) =>
    guides[index] && guides[index].getGuides().map((g) => g * zoom + rulerHeight);

  const handleChangeInput = ({ value, schemaId }: { value: string; schemaId: string }) =>
    changeSchemas([{ key: 'data', value, schemaId }]);

  return (
    <div
      ref={wrapRef}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(false);
      }}
      style={{ fontFamily: getFontFamily() }}
    >
      <Selecto
        {...getSelectoOpt()}
        container={wrapRef.current}
        continueSelect={isPressShiftKey}
        onDragStart={(e) => {
          if (e.inputEvent.type === 'touchstart' && e.isTrusted) {
            moveable.current && moveable.current.isMoveableElement(e.inputEvent.target);
            e.stop();
          }
        }}
        onSelect={(e: any) => {
          e.stop();
          setActiveElements(e.selected as HTMLElement[]);
        }}
      />
      <Paper
        scale={scale}
        schemas={schemas}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        render={({ index, schema, paperSize }) => {
          return (
            <>
              {pageCursor !== index ? (
                <Mask {...paperSize} />
              ) : (
                <Moveable
                  {...getMoveableOpt()}
                  ref={moveable}
                  target={activeElements || []}
                  bounds={{
                    left: 0,
                    top: 0,
                    bottom: paperSize.height + rulerHeight,
                    right: paperSize.width + rulerHeight,
                  }}
                  horizontalGuidelines={getGuideLines(horizontalGuides.current, index)}
                  verticalGuidelines={getGuideLines(verticalGuides.current, index)}
                  keepRatio={isPressShiftKey}
                  onDrag={onDrag}
                  onDragGroup={({ events }) => {
                    events.forEach(onDrag);
                  }}
                  onDragEnd={onDragEnd}
                  onDragGroupEnd={onDragEnds}
                  onResize={onResize}
                  onResizeGroup={({ events }) => {
                    events.forEach(onResize);
                  }}
                  onResizeEnd={onResizeEnd}
                  onResizeGroupEnd={onResizeEnds}
                  onClick={() => {
                    setEditing(true);
                    const ic = inputRef.current;
                    if (!ic) return;
                    ic.disabled = false;
                    ic.focus();
                    if (ic.type !== 'file') ic.setSelectionRange(ic.value.length, ic.value.length);
                  }}
                />
              )}
              <Guides
                paperSize={paperSize}
                horizontalRef={(e) => (horizontalGuides.current[index] = e!)}
                verticalRef={(e) => (verticalGuides.current[index] = e!)}
              />
              {Object.entries(schema).map((entry) => {
                const [key, s] = entry as [string, SchemaType];
                return (
                  <div key={key}>
                    <Schema
                      schema={s}
                      editable={editing && activeElements.map((ae) => ae.id).includes(s.id)}
                      placeholder={''}
                      tabIndex={0}
                      onChange={(value) => handleChangeInput({ value, schemaId: s.id })}
                      onMouseEnter={() => onMouseEnter(s.id)}
                      onMouseLeave={() => onMouseLeave()}
                      border={focusElementId === s.id ? '1px solid #d42802' : '1px dashed #4af'}
                      ref={inputRef}
                    />
                  </div>
                );
              })}
            </>
          );
        }}
      />
    </div>
  );
};
export default Main;
