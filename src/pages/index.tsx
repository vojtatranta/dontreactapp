import Head from "next/head";
import { HTMLAttributes, useEffect } from "react";
import { Maybe } from "actual-maybe"

import { api } from "~/utils/api";

type GetComponentProps<T extends (props: object, state: object, context: object) => unknown> = T extends (arg1: infer U, ...args: unknown[]) => unknown ? U : never;
type GetComponentState<T extends (props: object, state: object, context: object) => unknown> = T extends (arg1: infer U, arg2: infer S, ...args: unknown[]) => unknown ? S : never;
type GetComponentContext<T extends (props: object, state: object, context: object) => unknown> = T extends (arg1: infer U, arg2: infer S, arg3: infer C) => unknown ? C : never;

type ComponentFactoryType<CT extends DontReactComponentType = DontReactComponentType> = (state: GetComponentState<CT>) => (context: GetComponentContext<CT>) => DontReactElementType<GetComponentProps<CT>, GetComponentState<CT>, GetComponentContext<CT>>

type DontReactElementType<P = object, S = object, C = object> = {
  type: string
  props: P
  children: string | ComponentFactoryType<DontReactComponentType> | Array<string | DontReactElementType> | null
  attributes: object
  state: S
  context: C
}


type DontReactComponentType = (props: object, state: object, context: object) => DontReactElementType

type AppContext = {
  runSideEffect: () => void
  setState: <S extends object>(newState: S) => (S)
  onMount: () => void
  onUnmount: () => void
}


function componentFactory<CT extends DontReactComponentType>(aComponent: CT, props: GetComponentProps<CT>): ComponentFactoryType<CT> {
  return (state) => context => aComponent(props, state, context)
}


function ASubtitleComponent(props: { subtitle: string }, state: undefined, context: AppContext) {
  return {
    type: "h2",
    props: props,
    children: [
      props.subtitle,
    ],
    state,
    context
  }
}



function AContainer(props: {}, state: { isOn: boolean } = {isOn: false}, context: AppContext) {
  return {
    type: "div",
    props: props,
    attributes: {
      className: "text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]",
    },
    children: [
      componentFactory(ATitleComponent, {title: "Main title"}),
      componentFactory(ASubtitleComponent, {subtitle: "Subtitle"}),
    ],
    state,
    context
  }
}
function ATitleComponent(props: { title: string }, state: { isOn: boolean } = {isOn: false}, context: AppContext) {
  return {
    type: "h1",
    props: props,
    attributes: {
      onClick: () => {
        context.setState({isOn: !state.isOn})
      },
      className: "text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]",
    },
    children: [
      props.title,
      state.isOn ? "On" : "Off",
    ],
    state,
    context
  }
}

function runDontReactApp<CT extends DontReactComponentType>(element: HTMLElement, component: CT, compProps: GetComponentProps<CT>, context: GetComponentContext<CT>)  {
  element.innerHTML = ""

  const render = <CTX extends GetComponentContext<CT>>(result: DontReactElementType, localContext: CTX) => {
    const { type, attributes = {}, children, props} = result
    const onClick = "onClick" in attributes ? attributes.onClick : null
    const actualChildren = children ?? ("children" in props && props.children) ?? null
    const newElement = document.createElement(type)
    if (onClick) {
      newElement.addEventListener("click", onClick)
      delete attributes.onClick
    }
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        newElement.className = value as string
      } else {
        newElement.setAttribute(key, value as string)
      }
    })
    if (typeof actualChildren === "string") {
      newElement.appendChild(document.createTextNode(actualChildren))
    } else if (Array.isArray(actualChildren)) {
      actualChildren.forEach((child) => {
        if (typeof child === "string") {
          newElement.appendChild(document.createTextNode(child))
        } else if (typeof child === "function") {
          const childResult = child(result.state)(localContext)
          newElement.appendChild(render(childResult, localContext))
        } else {
          newElement.appendChild(render(child))
        }
      })
    }
    return newElement
  }

  const factoried = componentFactory(component, compProps)
  const unmounts = new Set<() => void>()
  const mounts = new Set<() => void>()

  const localSetState = <S extends GetComponentState<CT>>(newState: S) => {
    const nextResult = factoried(newState)(localContext)

    const localSetStateResult = render(nextResult, localContext)
    element.innerHTML = ""
    element.appendChild(localSetStateResult)
  }

  const localContext = {
    ...context,
    setState: localSetState,
    onMount: (cb: () => void) => mounts.add(cb),
    onUnmount: (cb: () => void) => unmounts.add(cb)
  }

  const firstRenderResult = factoried(undefined)(localContext)
  const renderedResult = render(firstRenderResult, localContext)

  element.appendChild(renderedResult)
  Array.from(mounts).forEach((cb) => cb())


  return {
    stop() {
      return null
    }
  }
}

export default function Home() {

  useEffect(() => {
    const elem = document.getElementById("dontreactapp")
    if (elem) {
      runDontReactApp(elem, AContainer, {title: "Hello"}, {runSideEffect: () => {alert("Efect!")}})
    }
      
  }, []);

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8" id="dontreactapp">
          </div>
        </div>
      </main>
    </>
  );
}
