import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
})
export class ClickOutsideDirective {
  @Output() appClickOutside: EventEmitter<{ context: string }> = new EventEmitter();
  @Input() triggerElement!: HTMLElement;
  @Input() context!: string; // Optional context to differentiate instances

  private touchEventTriggered = false;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:touchstart', ['$event.target'])
  public onTouchStart(targetElement: HTMLElement): void {
    this.touchEventTriggered = true;
    this.handleOutsideClick(targetElement);
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    if (!this.touchEventTriggered) {
      this.handleOutsideClick(targetElement);
    }
    this.touchEventTriggered = false;
  }

  private handleOutsideClick(targetElement: HTMLElement): void {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    const clickedTrigger = this.triggerElement?.contains(targetElement);
    if (!clickedInside && !clickedTrigger) {
      this.appClickOutside.emit({ context: this.context });
    }
  }
}
