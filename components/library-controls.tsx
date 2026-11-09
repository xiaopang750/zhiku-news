'use client';
import {useId,useState,useRef} from 'react';
import {Select,Popover,Dialog,Tabs,Collapsible} from 'radix-ui';
import {DayPicker} from 'react-day-picker';
import {zhCN} from 'react-day-picker/locale';
import {CalendarDays,ChevronDown,Check,X,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button as LibraryButton} from './ui/button';
import {Input as LibraryInput} from './ui/input';
export function Button(props:React.ComponentProps<typeof LibraryButton>){return <LibraryButton {...props}/> }
export function Input(props:React.ComponentProps<typeof LibraryInput>){return <LibraryInput {...props}/> }
export function FilterSelect({label,value,onChange,placeholder,options}:{label:string,value:string,onChange:(v:string)=>void,placeholder:string,options:{value:string,label:string}[]}){
 const id=useId();return <div className="filter-field"><label id={id}>{label}</label><Select.Root value={value||'__all'} onValueChange={v=>onChange(v==='__all'?'':v)}><Select.Trigger className="control-trigger" aria-labelledby={id}><Select.Value>{options.find(o=>o.value===value)?.label||placeholder}</Select.Value><Select.Icon><ChevronDown size={16}/></Select.Icon></Select.Trigger><Select.Portal><Select.Content className="select-popup" position="popper" sideOffset={8} collisionPadding={12}><Select.ScrollUpButton className="select-scroll">向上滚动</Select.ScrollUpButton><Select.Viewport><Select.Item className="select-option" value="__all"><Select.ItemText>{placeholder}</Select.ItemText><Select.ItemIndicator><Check size={15}/></Select.ItemIndicator></Select.Item>{options.map(o=><Select.Item className="select-option" value={o.value} key={o.value}><Select.ItemText>{o.label}</Select.ItemText><Select.ItemIndicator><Check size={15}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport><Select.ScrollDownButton className="select-scroll">向下滚动</Select.ScrollDownButton></Select.Content></Select.Portal></Select.Root></div>
}
export function DateFilter({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void}){
 const [open,setOpen]=useState(false),id=useId();const selected=value?new Date(value+'T12:00:00'):undefined;
 return <div className="filter-field"><label id={id}>{label}</label><Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><Button type="button" className="control-trigger date-trigger" aria-labelledby={id}><span>{value||'选择日期'}</span><CalendarDays size={16}/></Button></Popover.Trigger><Popover.Portal><Popover.Content className="calendar-popup" sideOffset={8} collisionPadding={12} align="end"><DayPicker mode="single" locale={zhCN} selected={selected} defaultMonth={selected} onSelect={d=>{onChange(d?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'):'');setOpen(false)}} labels={{labelPrevious:()=> '上个月',labelNext:()=> '下个月'}}/><div className="calendar-actions"><Button type="button" onClick={()=>{onChange('');setOpen(false)}}>清除日期</Button><Popover.Close asChild><Button type="button">关闭</Button></Popover.Close></div></Popover.Content></Popover.Portal></Popover.Root></div>
}
export function ArticleDialog({open,onClose,children}:{open:boolean,onClose:()=>void,children:React.ReactNode}){
 const returnFocus=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement as HTMLElement);
 return <Dialog.Root open={open} onOpenChange={v=>{if(!v)onClose()}}><Dialog.Portal><Dialog.Overlay className="reader-shade"/><Dialog.Content onCloseAutoFocus={e=>{e.preventDefault();returnFocus.current?.focus()}} className="detail library-dialog" aria-describedby="reader-description"><div className="detail-toolbar"><Dialog.Title>文章阅读</Dialog.Title><Dialog.Close asChild><Button type="button" aria-label="关闭文章"><X size={16}/>关闭</Button></Dialog.Close></div><Dialog.Description id="reader-description" className="visually-hidden">阅读文章分析、译文、原文与关联附件</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function ReadingTabs({value,onChange,attachments,children}:{value:string,onChange:(s:string)=>void,attachments:number,children:React.ReactNode}){
 return <Tabs.Root value={value} onValueChange={onChange}><Tabs.List className="tabs" aria-label="阅读方式">{[['analysis','要点分析'],['translation','中文全文'],['original','原文'],['attachments','附件 '+attachments]].map(([v,l])=><Tabs.Trigger className={value===v?'active':''} value={v} key={v}>{l}</Tabs.Trigger>)}</Tabs.List><Tabs.Content value={value} className="reading-panel">{children}</Tabs.Content></Tabs.Root>
}
export function Disclosure({title,children,className=''}:{title:string,children:React.ReactNode,className?:string}){return <Collapsible.Root className={'library-disclosure '+className}><Collapsible.Trigger className="disclosure-trigger">{title}<ChevronDown size={16}/></Collapsible.Trigger><Collapsible.Content>{children}</Collapsible.Content></Collapsible.Root>}
