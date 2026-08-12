// @vitest-environment jsdom
import "../setup-dom"
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

const card = () => document.querySelector('[data-slot="card"]') as HTMLElement
const header = () => document.querySelector('[data-slot="card-header"]') as HTMLElement
const content = () => document.querySelector('[data-slot="card-content"]') as HTMLElement
const footer = () => document.querySelector('[data-slot="card-footer"]') as HTMLElement

describe("Card density", () => {
  it("defaults to the roomy spacing", () => {
    render(
      <Card>
        <CardHeader>h</CardHeader>
        <CardContent>c</CardContent>
      </Card>,
    )

    expect(card().className).toContain("gap-6")
    expect(card().className).toContain("py-6")
    expect(header().className).toContain("px-6")
    expect(content().className).toContain("px-6")
  })

  // The vertical rhythm lives on Card and the horizontal padding on the slots, so
  // a call site that only tightened the slots was still paying the card's 24px
  // gap and py underneath. Density has to reach both from one declaration.
  it("propagates compact spacing from the Card to every slot", () => {
    render(
      <Card density="compact">
        <CardHeader>h</CardHeader>
        <CardContent>c</CardContent>
        <CardFooter>f</CardFooter>
      </Card>,
    )

    expect(card().className).toContain("gap-2")
    expect(card().className).toContain("py-2")
    expect(card().className).not.toContain("gap-6")
    expect(card().className).not.toContain("py-6")

    for (const slot of [header(), content(), footer()]) {
      expect(slot.className).toContain("px-2")
      expect(slot.className).not.toContain("px-6")
    }
  })

  it("exposes the density as a data attribute for styling and debugging", () => {
    render(<Card density="compact">x</Card>)
    expect(card()).toHaveAttribute("data-density", "compact")
  })

  it("still lets a call site override with its own className", () => {
    render(
      <Card density="compact">
        <CardContent className="px-8">c</CardContent>
      </Card>,
    )
    // className is merged last, so the explicit value wins over the density default.
    expect(content().className).toContain("px-8")
    expect(content().className).not.toContain("px-2")
  })

  it("does not leak density to a sibling card", () => {
    render(
      <>
        <Card density="compact" data-testid="compact">
          <CardContent>a</CardContent>
        </Card>
        <Card data-testid="roomy">
          <CardContent>b</CardContent>
        </Card>
      </>,
    )

    const contents = document.querySelectorAll('[data-slot="card-content"]')
    expect(contents[0].className).toContain("px-2")
    expect(contents[1].className).toContain("px-6")
  })
})
