interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  onTitleClick?: () => void;
}

export default function Header({ title, description, children, onTitleClick }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-xl font-bold text-gray-900 ${onTitleClick ? 'cursor-pointer hover:text-teal-600' : ''}`}
            onClick={onTitleClick}
          >
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
